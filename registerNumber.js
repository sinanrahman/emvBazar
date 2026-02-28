require('dotenv').config();
const axios = require('axios');

async function registerPhoneNumber() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/register`,
      {
        messaging_product: "whatsapp",
        pin: process.env.WHATSAPP_PIN // 6-digit PIN
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Phone number registered:", response.data);
  } catch (error) {
    console.error("❌ Registration error:", error.response?.data || error.message);
  }
}

registerPhoneNumber();