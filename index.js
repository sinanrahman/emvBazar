const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const app = express();
const port = process.env.PORT || 3005;

const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');


// Connect to Database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));



// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', authRoutes);
app.use('/', userRoutes);

// ==========================================
// WhatsApp Webhook Configuration
// ==========================================

// Webhook verification (one-time, for Meta to verify your endpoint)
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN; 
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified by Meta!');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Webhook event receiver — this is where delivery status comes in
app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach(entry => {
            entry.changes?.forEach(change => {
                const value = change.value;

                // Message status updates (sent, delivered, read, FAILED)
                value.statuses?.forEach(status => {
                    console.log('📬 Message Status:', JSON.stringify(status, null, 2));
                    // This will show you the REAL error if delivery fails
                });

                // Incoming messages from users
                value.messages?.forEach(message => {
                    console.log('📩 Incoming message:', JSON.stringify(message, null, 2));
                });
            });
        });

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

app.listen(port,'100.83.82.45', () => {
  console.log(`Server is running on port ${port}`);
});
