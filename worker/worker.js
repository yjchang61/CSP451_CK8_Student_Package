const amqplib = require('amqplib');

const QUEUE_NAME = 'notifications';
const RABBITMQ_USER = process.env.RABBITMQ_DEFAULT_USER || 'guest';
const RABBITMQ_PASS = process.env.RABBITMQ_DEFAULT_PASS || 'guest';

async function start() {
  console.log('Notification Worker starting...');

  let connection;
  // Retry loop — RabbitMQ may not be ready immediately
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      connection = await amqplib.connect(
        `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@queue:5672`
      );
      console.log('Connected to RabbitMQ');
      break;
    } catch (err) {
      console.log(`Attempt ${attempt}/30 — RabbitMQ not ready: ${err.message}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  if (!connection) {
    console.error('Failed to connect to RabbitMQ after 30 attempts');
    process.exit(1);
  }

  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.prefetch(1);

  console.log(`Waiting for messages in "${QUEUE_NAME}" queue...`);

  channel.consume(QUEUE_NAME, (msg) => {
    if (msg) {
      const order = JSON.parse(msg.content.toString());
      console.log(`📧 Sending notification for order #${order.orderId}: ${order.item}`);
      // Simulate notification processing
      setTimeout(() => {
        console.log(`✅ Notification sent for order #${order.orderId}`);
        channel.ack(msg);
      }, 1000);
    }
  });
}

start().catch((err) => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
