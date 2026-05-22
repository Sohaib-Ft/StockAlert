const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 4001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'auth-db';

async function startServer() {
  try {
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`);
    console.log(`✅ [auth-service] Connecté à MongoDB (${DB_NAME})`);

    app.listen(PORT, () => {
      console.log(`🚀 [auth-service] Démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ [auth-service] Erreur de démarrage:', error.message);
    process.exit(1);
  }
}

startServer();
