const axios = require('axios');
const FormData = require('form-data');

const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERSION = 'v19.0';

/**
 * Uploads a PDF buffer to WhatsApp Media API using form-data library.
 */
exports.uploadPDFToWhatsApp = async (pdfBuffer, fileName = 'invoice.pdf') => {
    try {
        if (!Buffer.isBuffer(pdfBuffer)) {
            throw new Error("PDF is not a Buffer");
        }

        const form = new FormData();
        form.append("messaging_product", "whatsapp");
        form.append("file", pdfBuffer, {
            filename: fileName,
            contentType: "application/pdf",
        });

        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/media`,
            form,
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    ...form.getHeaders(),
                },
                maxBodyLength: Infinity,
            }
        );

        console.log('WhatsApp Media Upload Success:', response.data.id);
        return response.data.id;
    } catch (error) {
        console.error("UPLOAD ERROR FULL:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Sends a document message via WhatsApp Cloud API.
 */
exports.sendDocumentMessage = async (to, mediaId, fileName = 'Invoice.pdf') => {
    try {
        const cleanPhone = to.replace(/\D/g, '');

        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "document",
                document: {
                    id: mediaId,
                    filename: fileName,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('WhatsApp Send Message Error:', error.response?.data || error.message);
        throw new Error('Failed to send document message via WhatsApp');
    }
};

/**
 * Sends a statement template in Malayalam without a header.
 */
exports.sendStatementTemplate = async (to, mediaId, name, dueAmount) => {
    try {
        const cleanPhone = to.replace(/\D/g, '');

        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "template",
                template: {
                    name: "emv_due",
                    language: { code: "ml" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: name },
                                { type: "text", text: `₹${dueAmount}` }
                            ]
                        }
                    ]
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('WhatsApp Statement Template Error:', error.response?.data || error.message);
        throw new Error('Failed to send statement template via WhatsApp');
    }
};


/**
 * Sends a welcome template when a new user is added.
 */
exports.sendUserAddedTemplate = async (to, name) => {
    try {
        const cleanPhone = to.replace(/\D/g, '');

        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "template",
                template: {
                    name: "user_added",
                    language: { code: "ml" },
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
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('WhatsApp User Added Template Error:', error.response?.data || error.message);
        throw new Error('Failed to send user added template via WhatsApp');
    }
};


