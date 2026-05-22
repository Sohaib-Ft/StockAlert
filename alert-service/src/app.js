const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const alertRoutes = require('./routes/alertRoutes');

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/alerts', alertRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'alert-service', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
});

module.exports = app;
