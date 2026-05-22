const mongoose = require('mongoose');
const app = require('./src/app');
const rabbitConsumer = require('./src/services/rabbitConsumer');

const PORT = process.env.PORT || 4004;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alert-db';

async function startServer() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`);
    console.log(`✅ [alert-service] Connecté à MongoDB (${DB_NAME})`);

    // Connexion à RabbitMQ (consumer)
    await rabbitConsumer.connect();

    // Démarrer le serveur HTTP
    app.listen(PORT, () => {
      console.log(`🚀 [alert-service] Démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ [alert-service] Erreur de démarrage:', error.message);
    process.exit(1);
  }
}

startServer();
