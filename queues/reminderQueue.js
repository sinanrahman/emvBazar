const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: {}
});

const reminderQueue = new Queue('reminderQueue', {
  connection
});

module.exports = reminderQueue;