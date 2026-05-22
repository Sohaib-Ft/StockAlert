const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const authMiddleware = require('../middleware/authMiddleware');

// Toutes les routes sont protégées par JWT
router.use(authMiddleware);

// Mouvements de stock
router.post('/entry', stockController.stockEntry);
router.post('/exit', stockController.stockExit);

// Niveaux de stock
router.get('/levels', stockController.getAllStockLevels);
router.get('/level/:productId', stockController.getStockLevel);

// Historique des mouvements
router.get('/movements', stockController.getAllMovements);
router.get('/movements/:productId', stockController.getMovementsByProduct);

module.exports = router;
