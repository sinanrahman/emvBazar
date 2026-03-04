const reminderQueue = require('../queues/reminderQueue');

async function scheduleWelcomeMessage(user) {
  const delay = 30 * 1000; // 30 seconds

  await reminderQueue.add(
    'welcomeMessage',
    {
      username: user.username,
      phone: user.phone
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

  console.log(`✅ Welcome message scheduled for ${user.username} in 30 seconds`);
}

module.exports = { scheduleWelcomeMessage };