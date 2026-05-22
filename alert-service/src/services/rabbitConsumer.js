const amqp = require('amqplib');
const Alert = require('../models/Alert');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'stock_alerts';
const QUEUE_NAME = 'stock_low_alerts';
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

let channel = null;
let connection = null;

/**
 * Connexion à RabbitMQ avec retry et backoff exponentiel.
 * Crée la queue et la lie à l'exchange fanout.
 * Consomme les messages d'alerte de stock bas.
 */
async function connect() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📡 [RabbitMQ Consumer] Tentative de connexion ${attempt}/${MAX_RETRIES}...`);
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      // Déclarer l'exchange (doit correspondre au publisher)
      await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

      // Déclarer la queue
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      // Lier la queue à l'exchange
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

      console.log('✅ [RabbitMQ Consumer] Connecté. En attente de messages...');

      // Consommer les messages
      channel.consume(QUEUE_NAME, async (msg) => {
        if (msg) {
          try {
            const alertData = JSON.parse(msg.content.toString());
            console.log(`📥 [RabbitMQ Consumer] Alerte reçue pour "${alertData.productName}"`);

            // Enregistrer l'alerte en base de données
            await Alert.create({
              productId: alertData.productId,
              productName: alertData.productName,
              currentStock: alertData.currentStock,
              minThreshold: alertData.minThreshold,
              message: alertData.message,
            });

            console.log(`💾 [RabbitMQ Consumer] Alerte enregistrée en base.`);

            // Acquitter le message
            channel.ack(msg);
          } catch (error) {
            console.error('❌ [RabbitMQ Consumer] Erreur de traitement:', error.message);
            // Rejeter le message et le remettre en queue
            channel.nack(msg, false, true);
          }
        }
      });

      // Gérer la fermeture de connexion
      connection.on('close', () => {
        console.warn('⚠️ [RabbitMQ Consumer] Connexion fermée. Reconnexion...');
        channel = null;
        setTimeout(connect, RETRY_DELAY_MS);
      });

      connection.on('error', (err) => {
        console.error('❌ [RabbitMQ Consumer] Erreur de connexion:', err.message);
      });

      return;
    } catch (error) {
      console.error(`❌ [RabbitMQ Consumer] Tentative ${attempt} échouée:`, error.message);
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`⏳ Nouvelle tentative dans ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('❌ [RabbitMQ Consumer] Impossible de se connecter après toutes les tentatives.');
      }
    }
  }
}

module.exports = { connect };
