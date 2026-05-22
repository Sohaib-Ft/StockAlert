const axios = require('axios');
const Movement = require('../models/Movement');
const { publishStockAlert } = require('../services/rabbitPublisher');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:4002';

/**
 * Récupère les informations d'un produit depuis le product-service.
 * Transmet le token JWT pour l'authentification inter-service.
 */
async function getProductInfo(productId, authToken) {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${productId}`, {
      headers: { Authorization: authToken },
    });
    return response.data.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw new Error(`Erreur lors de la communication avec product-service: ${error.message}`);
  }
}

/**
 * Calcule le stock actuel d'un produit en agrégeant tous ses mouvements.
 */
async function calculateCurrentStock(productId) {
  const result = await Movement.aggregate([
    { $match: { productId } },
    {
      $group: {
        _id: '$productId',
        totalEntries: {
          $sum: { $cond: [{ $eq: ['$type', 'entry'] }, '$quantity', 0] },
        },
        totalExits: {
          $sum: { $cond: [{ $eq: ['$type', 'exit'] }, '$quantity', 0] },
        },
      },
    },
  ]);

  if (result.length === 0) return 0;
  return result[0].totalEntries - result[0].totalExits;
}

/**
 * POST /api/stock/entry
 * Enregistrer une entrée de stock (réception de marchandise)
 */
exports.stockEntry = async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'productId et quantity sont requis.',
      });
    }

    // Vérifier que le produit existe
    const product = await getProductInfo(productId, req.headers.authorization);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé dans le catalogue.',
      });
    }

    // Calculer le stock actuel avant le mouvement
    const previousStock = await calculateCurrentStock(productId);
    const newStock = previousStock + quantity;

    // Créer le mouvement
    const movement = await Movement.create({
      productId,
      type: 'entry',
      quantity,
      reason: reason || 'Réception de marchandise',
      currentStock: newStock,
      productName: product.name,
    });

    res.status(201).json({
      success: true,
      message: `Entrée de ${quantity} unités enregistrée pour "${product.name}".`,
      data: {
        movement,
        previousStock,
        currentStock: newStock,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'entrée de stock.',
      error: error.message,
    });
  }
};

/**
 * POST /api/stock/exit
 * Enregistrer une sortie de stock (vente ou utilisation)
 * Déclenche une alerte RabbitMQ si le stock passe sous le seuil minimum.
 */
exports.stockExit = async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'productId et quantity sont requis.',
      });
    }

    // Vérifier que le produit existe
    const product = await getProductInfo(productId, req.headers.authorization);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé dans le catalogue.',
      });
    }

    // Calculer le stock actuel
    const previousStock = await calculateCurrentStock(productId);

    // Vérifier qu'il y a assez de stock
    if (previousStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant. Stock actuel: ${previousStock}, demandé: ${quantity}.`,
      });
    }

    const newStock = previousStock - quantity;

    // Créer le mouvement
    const movement = await Movement.create({
      productId,
      type: 'exit',
      quantity,
      reason: reason || 'Vente',
      currentStock: newStock,
      productName: product.name,
    });

    // Vérifier si le stock est passé sous le seuil minimum → alerte RabbitMQ
    let alertSent = false;
    if (newStock < product.minThreshold) {
      alertSent = await publishStockAlert({
        productId,
        productName: product.name,
        currentStock: newStock,
        minThreshold: product.minThreshold,
      });
    }

    res.status(201).json({
      success: true,
      message: `Sortie de ${quantity} unités enregistrée pour "${product.name}".`,
      data: {
        movement,
        previousStock,
        currentStock: newStock,
        alertTriggered: newStock < product.minThreshold,
        alertSent,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la sortie de stock.',
      error: error.message,
    });
  }
};

/**
 * GET /api/stock/level/:productId
 * Niveau de stock actuel d'un produit
 */
exports.getStockLevel = async (req, res) => {
  try {
    const { productId } = req.params;

    // Vérifier que le produit existe
    const product = await getProductInfo(productId, req.headers.authorization);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé dans le catalogue.',
      });
    }

    const currentStock = await calculateCurrentStock(productId);

    res.json({
      success: true,
      data: {
        productId,
        productName: product.name,
        currentStock,
        minThreshold: product.minThreshold,
        status: currentStock < product.minThreshold ? 'CRITIQUE' : 'OK',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur.',
      error: error.message,
    });
  }
};

/**
 * GET /api/stock/levels
 * Niveaux de stock de tous les produits (tableau de bord)
 */
exports.getAllStockLevels = async (req, res) => {
  try {
    // Agréger les stocks par produit
    const stockLevels = await Movement.aggregate([
      {
        $group: {
          _id: '$productId',
          productName: { $last: '$productName' },
          totalEntries: {
            $sum: { $cond: [{ $eq: ['$type', 'entry'] }, '$quantity', 0] },
          },
          totalExits: {
            $sum: { $cond: [{ $eq: ['$type', 'exit'] }, '$quantity', 0] },
          },
          lastMovement: { $max: '$createdAt' },
        },
      },
      {
        $addFields: {
          currentStock: { $subtract: ['$totalEntries', '$totalExits'] },
        },
      },
      { $sort: { currentStock: 1 } }, // Les plus bas en premier
    ]);

    res.json({
      success: true,
      count: stockLevels.length,
      data: stockLevels.map((s) => ({
        productId: s._id,
        productName: s.productName,
        currentStock: s.currentStock,
        totalEntries: s.totalEntries,
        totalExits: s.totalExits,
        lastMovement: s.lastMovement,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur.',
      error: error.message,
    });
  }
};

/**
 * GET /api/stock/movements/:productId
 * Historique des mouvements d'un produit
 */
exports.getMovementsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const movements = await Movement.find({ productId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: movements.length,
      data: movements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur.',
      error: error.message,
    });
  }
};

/**
 * GET /api/stock/movements
 * Historique complet de tous les mouvements
 */
exports.getAllMovements = async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const movements = await Movement.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: movements.length,
      data: movements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur.',
      error: error.message,
    });
  }
};
