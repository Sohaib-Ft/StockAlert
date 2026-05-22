const mongoose = require('mongoose');
const app = require('./src/app');
const rabbitPublisher = require('./src/services/rabbitPublisher');

const PORT = process.env.PORT || 4003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'stock-db';

async function startServer() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`);
    console.log(`✅ [stock-service] Connecté à MongoDB (${DB_NAME})`);

    // Connexion à RabbitMQ (publisher)
    await rabbitPublisher.connect();

    // Démarrer le serveur HTTP
    app.listen(PORT, () => {
      console.log(`🚀 [stock-service] Démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ [stock-service] Erreur de démarrage:', error.message);
    process.exit(1);
  }
}

startServer();
