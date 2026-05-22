const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');

// Toutes les routes sont protégées par JWT
router.use(authMiddleware);

router.get('/', alertController.getAllAlerts);
router.get('/unread', alertController.getUnreadAlerts);
router.put('/:id/read', alertController.markAsRead);
router.put('/read-all', alertController.markAllAsRead);

module.exports = router;
