const axios = require('axios');
const FormData = require('form-data');

const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERSION = 'v25.0'; // Updated to match user's working version

/**
 * Helper to ensure phone number has country code 91
 */
const formatPhone = (phone) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10) {
        return '91' + clean;
    }
    return clean;
};

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
        const cleanPhone = formatPhone(to);

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
        const cleanPhone = formatPhone(to);

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
 * Sends the 'reminder' Malayalam template with a link to the invoice.
 * Template body: 
 * പ്രിയപ്പെട്ട {{1}},
 * നിങ്ങളുടെ ഈ മാസത്തെ ബിൽ തയ്യാറായി.
 * ബിൽ കാണാൻ താഴെയുള്ള ലിങ്ക് തുറക്കുക:
 * https://emv-bazar.com/invoice/{{2}}
 */
exports.sendReminderTemplate = async (to, name, userId) => {
    try {
        const cleanPhone = formatPhone(to);

        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "template",
                template: {
                    name: "reminder",
                    language: { code: "ml" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: name },
                                { type: "text", text: userId }
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
        console.error('WhatsApp Reminder Template Error:', error.response?.data || error.message);
        throw new Error('Failed to send reminder template via WhatsApp');
    }
};


/**
 * Sends the user_added welcome template (Malayalam) when a new user is added.
 * Template: നമസ്കാരം {{1}}, ...
 */
exports.sendUserAddedTemplate = async (to, name) => {
    try {
        const cleanPhone = formatPhone(to);
        // Ensure name is a non-empty string; template allows one body parameter
        const safeName = (name != null ? String(name).trim() : '') || 'Customer';
        const nameParam = safeName.slice(0, 256); // WhatsApp template param limit

        const payload = {
            messaging_product: "whatsapp",
            to: String(cleanPhone),
            type: "template",
            template: {
                name: "user_added",
                language: { code: "ml" },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: nameParam }
                        ]
                    }
                ]
            }
        };

        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        const metaError = error.response?.data;
        console.error('WhatsApp User Added Template Error:', metaError || error.message);
        if (metaError) {
            console.error('Meta error details:', JSON.stringify(metaError, null, 2));
        }
        throw new Error('Failed to send user added template via WhatsApp');
    }
};


/**
 * Sends a PDF reminder template.
 */
exports.sendPDFReminderTemplate = async (to, name) => {
    try {
        const cleanPhone = formatPhone(to);

        const response = await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: cleanPhone,
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
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('WhatsApp PDF Reminder Template Error:', error.response?.data || error.message);
        throw new Error('Failed to send PDF reminder template via WhatsApp');
    }
};


