const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'stock_alerts';
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

let channel = null;
let connection = null;

/**
 * Connexion à RabbitMQ avec retry et backoff exponentiel.
 * Crée un exchange de type fanout pour les alertes de stock bas.
 */
async function connect() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📡 [RabbitMQ Publisher] Tentative de connexion ${attempt}/${MAX_RETRIES}...`);
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      // Déclarer l'exchange de type fanout
      await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

      console.log('✅ [RabbitMQ Publisher] Connecté et exchange créé.');

      // Gérer la fermeture de connexion
      connection.on('close', () => {
        console.warn('⚠️ [RabbitMQ Publisher] Connexion fermée. Reconnexion...');
        channel = null;
        setTimeout(connect, RETRY_DELAY_MS);
      });

      connection.on('error', (err) => {
        console.error('❌ [RabbitMQ Publisher] Erreur de connexion:', err.message);
      });

      return;
    } catch (error) {
      console.error(`❌ [RabbitMQ Publisher] Tentative ${attempt} échouée:`, error.message);
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`⏳ Nouvelle tentative dans ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('❌ [RabbitMQ Publisher] Impossible de se connecter après toutes les tentatives.');
      }
    }
  }
}

/**
 * Publie un message d'alerte de stock bas sur l'exchange.
 * @param {Object} alertData - Données de l'alerte
 * @param {string} alertData.productId - ID du produit
 * @param {string} alertData.productName - Nom du produit
 * @param {number} alertData.currentStock - Stock actuel
 * @param {number} alertData.minThreshold - Seuil minimum
 */
async function publishStockAlert(alertData) {
  if (!channel) {
    console.error('❌ [RabbitMQ Publisher] Canal non disponible. Alerte non envoyée.');
    return false;
  }

  try {
    const message = {
      ...alertData,
      timestamp: new Date().toISOString(),
      message: `⚠️ ALERTE: Le stock de "${alertData.productName}" (${alertData.currentStock} unités) est passé sous le seuil minimum (${alertData.minThreshold} unités).`,
    };

    channel.publish(
      EXCHANGE_NAME,
      '', // routing key vide pour fanout
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log(`📤 [RabbitMQ Publisher] Alerte publiée pour "${alertData.productName}"`);
    return true;
  } catch (error) {
    console.error('❌ [RabbitMQ Publisher] Erreur lors de la publication:', error.message);
    return false;
  }
}

module.exports = { connect, publishStockAlert };
