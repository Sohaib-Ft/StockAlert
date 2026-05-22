const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const stockRoutes = require('./routes/stockRoutes');

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/stock', stockRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'stock-service', timestamp: new Date().toISOString() });
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
