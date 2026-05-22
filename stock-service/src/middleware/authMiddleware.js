const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'stockalert_default_secret';

/**
 * Middleware d'authentification JWT.
 * Vérifie le header Authorization: Bearer <token>
 * et injecte req.user avec les données décodées.
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Token manquant ou format invalide.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré. Veuillez vous reconnecter.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token invalide.',
    });
  }
};

module.exports = authMiddleware;
