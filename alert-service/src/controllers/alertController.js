const Alert = require('../models/Alert');

/**
 * GET /api/alerts
 * Lister toutes les alertes (les plus récentes en premier)
 */
exports.getAllAlerts = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const alerts = await Alert.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des alertes.',
      error: error.message,
    });
  }
};

/**
 * GET /api/alerts/unread
 * Lister les alertes non lues
 */
exports.getUnreadAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ read: false }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
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
 * PUT /api/alerts/:id/read
 * Marquer une alerte comme lue
 */
exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée.',
      });
    }

    res.json({
      success: true,
      message: 'Alerte marquée comme lue.',
      data: alert,
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
 * PUT /api/alerts/read-all
 * Marquer toutes les alertes comme lues
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Alert.updateMany({ read: false }, { read: true });

    res.json({
      success: true,
      message: `${result.modifiedCount} alerte(s) marquée(s) comme lue(s).`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur.',
      error: error.message,
    });
  }
};
