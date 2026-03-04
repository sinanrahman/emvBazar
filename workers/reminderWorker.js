const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Worker } = require('bullmq');
const axios = require('axios');
const mongoose = require('mongoose');
const connection = require('../config/redis');
const User = require('../model/User');
const { sendUserAddedTemplate, sendPDFReminderTemplate } = require('../utils/whatsappService');

mongoose.connect(process.env.DB_URL);


const worker = new Worker(
  'reminderQueue',
  async (job) => {
    console.log("🔥 Processing job:", job.name, job.id);

    const { phone, username } = job.data;

    // Find user to check opt-in
    const user = await User.findOne({ phone });

    if (!user || !user.whatsappOptIn) {
      console.log(`⚠️ Skip: ${username} (${phone}) has not opted in for WhatsApp.`);
      return;
    }

    // Handle User Added Welcome Message
    if (job.name === 'welcomeMessage') {
      try {
        const result = await sendUserAddedTemplate(phone, username);
        console.log(`🎉 Welcome message sent to ${username} (${phone})`);
        console.log(`META SUCCESS RESPONSE:`, JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(`❌ Welcome message failed for ${username}:`, error.message);
        throw error;
      }
      return;
    }

    // Handle Payment Reminder
    if (job.name === 'paymentReminder' || !job.name) {
      if (user.status === "paid" || !user.reminderActive) {
        console.log("⚠️ Reminder skipped (paid or inactive)");
        return;
      }

      await sendPDFReminderTemplate(phone, username);
      console.log(`🎉 PDF reminder sent to ${username}`);
    }
  },
  {
    connection,
    skipCheck: true
  }
);

worker.on('completed', (job) => {
  console.log(`🎉 Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed`, err);
});

console.log('🚀 Reminder worker running...');