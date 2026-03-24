const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });  // 🔥 VERY IMPORTANT (Robust Path)

const IORedis = require('ioredis');

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined. Check your .env file.");
}

console.log("Connecting to:", process.env.REDIS_URL);

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,

  family: 4, // 🔥 FORCE IPv4 (THIS FIXES YOUR ISSUE)

  connectTimeout: 10000, // avoid long hanging

  retryStrategy: (times) => {
    console.log(`Retrying Redis... attempt ${times}`);
    return Math.min(times * 500, 3000);
  },

  tls: process.env.REDIS_URL.startsWith('rediss://')
    ? { rejectUnauthorized: false }
    : undefined
});

connection.on('connect', () => {
  console.log('✅ Redis connected');
});

connection.on('ready', () => {
  console.log('🚀 Redis ready');
});

connection.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

module.exports = connection;