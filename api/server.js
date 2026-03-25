const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const amqplib = require('amqplib');

const app = express();
const PORT = 4000;

app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'urbaneats',
});

// Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'cache',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

// RabbitMQ connection
let rabbitChannel = null;
async function connectRabbit() {
  try {
    const user = process.env.RABBITMQ_DEFAULT_USER || 'guest';
    const pass = process.env.RABBITMQ_DEFAULT_PASS || 'guest';
    const conn = await amqplib.connect(`amqp://${user}:${pass}@queue:5672`);
    rabbitChannel = await conn.createChannel();
    await rabbitChannel.assertQueue('notifications', { durable: true });
    console.log('Connected to RabbitMQ');
  } catch (err) {
    console.log('RabbitMQ not ready, retrying in 5s...', err.message);
    setTimeout(connectRabbit, 5000);
  }
}

// Initialize database table
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        item VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.log('DB not ready, retrying in 5s...', err.message);
    setTimeout(initDB, 5000);
  }
}

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'healthy', service: 'urbaneats-api', db: 'connected' });
  } catch (err) {
    res.status(200).json({ status: 'healthy', service: 'urbaneats-api', db: 'connecting' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { item } = req.body;
    const result = await pool.query(
      'INSERT INTO orders (item) VALUES ($1) RETURNING *',
      [item || 'Pizza Margherita']
    );
    const order = result.rows[0];

    // Cache the order
    await redis.set(`order:${order.id}`, JSON.stringify(order), 'EX', 3600);

    // Publish notification
    if (rabbitChannel) {
      rabbitChannel.sendToQueue(
        'notifications',
        Buffer.from(JSON.stringify({ orderId: order.id, item: order.item }))
      );
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 20');
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`UrbanEats API running on port ${PORT}`);
  initDB();
  connectRabbit();
});
