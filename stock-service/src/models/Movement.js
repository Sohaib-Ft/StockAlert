const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, 'L\'ID du produit est requis'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['entry', 'exit'],
        message: 'Le type doit être "entry" ou "exit"',
      },
      required: [true, 'Le type de mouvement est requis'],
    },
    quantity: {
      type: Number,
      required: [true, 'La quantité est requise'],
      min: [1, 'La quantité doit être au moins 1'],
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    currentStock: {
      type: Number,
      required: true,
    },
    productName: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index composé pour les requêtes fréquentes
movementSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('Movement', movementSchema);
