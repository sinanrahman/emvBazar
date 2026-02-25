// controller/messageController.js
const reminderQueue = require('../queues/reminderQueue');

async function scheduleOneMinuteReminder(user) {

  const delay = 60 * 1000; // ✅ 1 minute in milliseconds

  await reminderQueue.add(
    'paymentReminder',
    {
      username: user.username,
      phone: user.phone,
      dueDate: user.dueDate || null
    },
    {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  );

  console.log(`✅ 1-minute reminder scheduled for ${user.username}`);
}

module.exports = { scheduleOneMinuteReminder };