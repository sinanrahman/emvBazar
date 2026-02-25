// config/redis.js
require('dotenv').config();  // 🔥 VERY IMPORTANT

const IORedis = require('ioredis');

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined. Check your .env file.");
}

console.log("Connecting to:", process.env.REDIS_URL);

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: {} // required for rediss
});

module.exports = connection;