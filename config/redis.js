const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });  // 🔥 VERY IMPORTANT (Robust Path)

const IORedis = require('ioredis');

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined. Check your .env file.");
}

console.log("Connecting to:", process.env.REDIS_URL);

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  family: 0, // Automatically fallback to IPv4 to prevent IPv6 routing ETIMEDOUT errors
  tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

module.exports = connection;