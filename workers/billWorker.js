require('dotenv').config();
const { Worker } = require('bullmq');
const connection = require('../config/redis');
const { generatePDFBuffer } = require('../utils/pdfGenerator');
const { uploadPDFToWhatsApp, sendDocumentMessage, sendStatementTemplate } = require('../utils/whatsappService');
const Bill = require('../model/Bill');
const User = require('../model/User');
const connectDB = require('../config/db');

// Connect to DB in worker process
connectDB();

const billWorker = new Worker('billQueue', async (job) => {
    const { adminAuth, appUrl, phone } = job.data;
    const cookies = adminAuth ? { auth: adminAuth } : {};

    try {
        if (job.name === 'sendBill') {
            const { billId } = job.data;
            const bill = await Bill.findById(billId);
            if (!bill) throw new Error(`Bill ${billId} not found`);

            // 1. Generate PDF
            const pdfUrl = `${appUrl}/view-bill/${billId}`;
            console.log(`Generating PDF for Bill: ${pdfUrl}`);
            const pdfBuffer = await generatePDFBuffer(pdfUrl, cookies);

            // Debug logs
            console.log("PDF type:", typeof pdfBuffer);
            console.log("Is Buffer:", Buffer.isBuffer(pdfBuffer));

            // 2. Upload to WhatsApp
            const mediaId = await uploadPDFToWhatsApp(pdfBuffer, `Invoice_${billId}.pdf`);

            // 3. Send Message
            await sendDocumentMessage(phone, mediaId, `Invoice_${bill.username}.pdf`);
            console.log(`Successfully sent Bill ${billId} to ${phone}`);
        }

        else if (job.name === 'sendStatement') {
            const { userId, dueAmount, filterParams } = job.data;
            const user = await User.findById(userId);
            if (!user) throw new Error(`User ${userId} not found`);

            // 1. Construct Statement URL with filters
            let statementUrl = `${appUrl}/user/${userId}/history/invoice`;
            const params = new URLSearchParams();
            if (filterParams.filter) params.append('filter', filterParams.filter);
            if (filterParams.startDate) params.append('startDate', filterParams.startDate);
            if (filterParams.endDate) params.append('endDate', filterParams.endDate);
            if (params.toString()) statementUrl += `?${params.toString()}`;

            console.log(`Generating Statement PDF: ${statementUrl}`);
            const pdfBuffer = await generatePDFBuffer(statementUrl, cookies);

            // 2. Upload to WhatsApp
            const mediaId = await uploadPDFToWhatsApp(pdfBuffer, `Statement_${user.username}.pdf`);

            // 3. Send Template Message (Sent FIRST)
            await sendStatementTemplate(phone, mediaId, user.username, dueAmount);

            // Wait 2 seconds to ensure WhatsApp delivers the text before the document
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. Send PDF Document Message (Sent SECOND)
            await sendDocumentMessage(phone, mediaId, `Statement_${user.username}.pdf`);

            console.log(`Successfully sent Template then Statement to ${user.username} (${phone})`);
        }

        return { success: true };
    } catch (error) {
        console.error(`Error in billWorker for job ${job.id} (${job.name}):`, error.message);
        throw error;
    }
}, {

    connection,
    concurrency: 2
});


billWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

billWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
});

module.exports = billWorker;
