require('dotenv').config();

const { Worker } = require('bullmq');
const axios = require('axios');
const mongoose = require('mongoose');
const connection = require('../config/redis');
const User = require('../model/User');

mongoose.connect(process.env.MONGO_URI);

async function sendWhatsAppMessage(phone, name, dueDate) {
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: "91" + phone, // ✅ No +
        type: "template",
        template: {
          name: "monthly_debt_reminder",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: name },
                { type: "text", text: dueDate }
              ]
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`✅ WhatsApp sent to ${phone}`);
  } catch (error) {
    console.error("❌ WhatsApp Error:", error.response?.data || error.message);
    throw error;
  }
}

const worker = new Worker(
  'reminderQueue',
  async (job) => {
    console.log("🔥 Processing job:", job.id);

    const { username, phone, dueDate } = job.data;

    const user = await User.findOne({ phone });

    // ✅ Stop if user not found or already paid
    if (!user || user.status === "paid" || !user.reminderActive) {
      console.log("⚠️ Reminder skipped (paid or inactive)");
      return;
    }

    const formattedDate = new Date(dueDate).toLocaleDateString();

    await sendWhatsAppMessage(phone, username, formattedDate);

    console.log(`🎉 Reminder sent to ${username}`);
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`🎉 Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed`, err);
});

console.log('🚀 Reminder worker running...');