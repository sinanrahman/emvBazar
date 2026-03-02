const axios = require('axios');
const FormData = require('form-data');

const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERSION = 'v25.0'; // Updated to match reminderWorker

/**
 * Uploads a PDF buffer to WhatsApp Media API.
 * @param {Buffer} pdfBuffer - The PDF file as a buffer.
 * @param {string} fileName - Name of the file.
 * @returns {Promise<string>} - The media ID.
 */
exports.uploadPDFToWhatsApp = async (pdfBuffer, fileName = 'invoice.pdf') => {
    try {
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', pdfBuffer, {
            filename: fileName,
            contentType: 'application/pdf',
        });
        formData.append('type', 'application/pdf');

        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/media`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                },
            }
        );

        return response.data.id;
    } catch (error) {
        console.error('WhatsApp Media Upload Error:', error.response?.data || error.message);
        throw new Error('Failed to upload PDF to WhatsApp');
    }
};

/**
 * Sends a document message via WhatsApp Cloud API.
 * @param {string} to - Customer phone number (with country code, no +).
 * @param {string} mediaId - The media ID from upload.
 * @param {string} fileName - Display name for the document.
 * @returns {Promise<Object>} - API response.
 */
exports.sendDocumentMessage = async (to, mediaId, fileName = 'Invoice.pdf') => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'document',
                document: {
                    id: mediaId,
                    filename: fileName
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('WhatsApp Send Message Error:', error.response?.data || error.message);
        throw new Error('Failed to send document message via WhatsApp');
    }
};
