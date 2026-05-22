const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, 'L\'ID du produit est requis'],
      index: true,
    },
    productName: {
      type: String,
      default: '',
    },
    currentStock: {
      type: Number,
      required: true,
    },
    minThreshold: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour les requêtes d'alertes non lues
alertSchema.index({ read: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
