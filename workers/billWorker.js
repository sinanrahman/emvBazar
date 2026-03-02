require('dotenv').config();
const { Worker } = require('bullmq');
const connection = require('../config/redis');
const { generatePDFBuffer } = require('../utils/pdfGenerator');
const { uploadPDFToWhatsApp, sendDocumentMessage } = require('../utils/whatsappService');
const Bill = require('../model/Bill');
const connectDB = require('../config/db');

// Connect to DB in worker process
connectDB();

const billWorker = new Worker('billQueue', async (job) => {
    const { billId, phone, adminAuth, appUrl } = job.data;

    console.log(`Processing bill ${billId} for phone ${phone}`);

    try {
        const bill = await Bill.findById(billId);
        if (!bill) {
            throw new Error(`Bill ${billId} not found`);
        }

        // 1. Generate PDF
        const pdfUrl = `${appUrl}/view-bill/${billId}`;
        const cookies = adminAuth ? { auth: adminAuth } : {};

        console.log(`Generating PDF for URL: ${pdfUrl}`);
        const pdfBuffer = await generatePDFBuffer(pdfUrl, cookies);

        // 2. Upload to WhatsApp
        console.log(`Uploading PDF to WhatsApp Media API...`);
        const mediaId = await uploadPDFToWhatsApp(pdfBuffer, `Invoice_${billId}.pdf`);

        // 3. Send Message
        console.log(`Sending document message to ${phone}...`);
        await sendDocumentMessage(phone, mediaId, `Invoice_${bill.username}.pdf`);

        console.log(`Successfully sent bill ${billId} to ${phone}`);
        return { success: true };
    } catch (error) {
        console.error(`Error in billWorker for job ${job.id}:`, error.message);
        throw error; // Let BullMQ handle retries
    }
}, {
    connection,
    concurrency: 2 // Adjust based on Render plan resources
});

billWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

billWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
});

module.exports = billWorker;
