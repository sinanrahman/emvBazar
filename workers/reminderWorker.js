require('dotenv').config();

const { Worker } = require('bullmq');
const axios = require('axios');
const mongoose = require('mongoose');
const connection = require('../config/redis');
const User = require('../model/User');

mongoose.connect(process.env.DB_URL);

async function sendWhatsAppMessage(phone, name) {
  try {
    const response = await axios.post(
  `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
  {
    messaging_product: "whatsapp",
    to: "91" + phone,
    type: "template",
    template: {
      name: "pdf",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: name }
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

console.log("META RESPONSE:", response.data);
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

    const { phone, username } = job.data;

    const user = await User.findOne({ phone });

    if (!user || user.status === "paid" || !user.reminderActive) {
      console.log("⚠️ Reminder skipped (paid or inactive)");
      return;
    }

    await sendWhatsAppMessage(phone, username);

    console.log(`🎉 PDF reminder sent to ${username}`);
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