// queues/reminderQueue.js
const { Queue } = require('bullmq');
const connection = require('../config/redis');

const reminderQueue = new Queue('reminderQueue', {
  connection,
  skipCheck: true
});

module.exports = reminderQueue;