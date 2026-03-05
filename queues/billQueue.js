const { Queue } = require('bullmq');
const connection = require('../config/redis');

const billQueue = new Queue('billQueue', {
    connection,
    skipCheck: true,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
    }
});

module.exports = billQueue;
