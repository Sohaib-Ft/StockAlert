const Product = require('../models/Product');

/**
 * POST /api/products
 * Ajouter un nouveau produit au catalogue
 */
exports.createProduct = async (req, res) => {
  try {
    const { name, description, category, price, minThreshold } = req.body;

    const product = await Product.create({
      name,
      description,
      category,
      price,
      minThreshold,
    });

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès.',
      data: product,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation.',
        errors: messages,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du produit.',
      error: error.message,
    });
  }
};

/**
 * GET /api/products
 * Lister tous les produits
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des produits.',
      error: error.message,
    });
  }
};

/**
 * GET /api/products/:id
 * Détail d'un produit
 */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé.',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de produit invalide.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur serveur.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/products/:id
 * Modifier un produit
 */
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, category, price, minThreshold } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, category, price, minThreshold },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé.',
      });
    }

    res.json({
      success: true,
      message: 'Produit mis à jour avec succès.',
      data: product,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation.',
        errors: messages,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/products/:id
 * Supprimer un produit
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé.',
      });
    }

    res.json({
      success: true,
      message: 'Produit supprimé avec succès.',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression.',
      error: error.message,
    });
  }
};
