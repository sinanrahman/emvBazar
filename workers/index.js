const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('--- Starting Background Workers ---');

// Import workers to start them
// BullMQ workers start automatically when instantiated
require('./reminderWorker');
require('./billWorker');

console.log('✅ All workers (Reminder, Bill) are running.');
