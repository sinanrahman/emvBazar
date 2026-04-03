const User = require('../model/User');
const Bill = require('../model/Bill');
const { generatePDFBuffer } = require('../utils/pdfGenerator');
const { uploadPDFToWhatsApp, sendDocumentMessage, sendStatementTemplate, sendReminderTemplate } = require('../utils/whatsappService');

User.on('index', (err) => {
    if (err) console.error('Index error:', err);
    else console.log('Indexes synced successfully');
});

exports.getHomePage = (req, res) => {
    res.render('home');
};

exports.getDashboard = async (req, res) => {
    try {
        const monthlyUsers = await User.find({ type: 'monthly' });
        const fixedUsers = await User.find({ type: 'fixed' });
        const uncertainUsers = await User.find({ type: 'uncertain' });

        res.render('index', {
            monthlyCount: monthlyUsers.length,
            fixedCount: fixedUsers.length,
            uncertainCount: uncertainUsers.length,
            username: "admin",
            currentPage: 'home'
        });
    } catch (error) {
        res.status(500).send("Error loading dashboard");
    }
};

exports.getAddUser = (req, res) => {
    res.render('addUser', { success: null, error: null, currentPage: 'addUser' });
};

exports.getBills = async (req, res) => {
    try {
        // Only fetch users who have requested bills
        const users = await User.find({ billNeeded: true }).sort({ username: 1 });
        res.render('bills', {
            users,
            currentPage: 'bills'
        });
    } catch (error) {
        console.error("Error loading billing page:", error);
        res.status(500).send("Error loading billing page");
    }
};

exports.getByType = async (req, res) => {
    try {
        const { type } = req.params;
        const users = await User.find({ type });
        res.render('userList', {
            type,
            users,
            currentPage: 'home'
        });
    } catch (error) {
        res.status(500).send("Error loading user list");
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        // const bills = await Bill.find({ phone: user.phone });
        const bills = await Bill.find({username:user.username})
        res.render('userDetails', { user, bills, currentPage: 'home' });
    } catch (error) {
        res.status(500).send("Error loading customer details");
    }
};

exports.getUserHistory = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        // const bills = await Bill.find({ phone: user.phone }).sort({ createdAt: -1 });
        const bills = await Bill.find({ username:user.username }).sort({ createdAt: -1 });
        res.render('userhistory', { user, bills, currentPage: 'home' });
    } catch (error) {
        res.status(500).send("Error loading purchase history");
    }
};

exports.getHistoryInvoice = async (req, res) => {
    try {
        const { startDate, endDate, filter } = req.query;
        const user = await User.findById(req.params.id);

        let query = { phone: user.phone };
        let dateFilter = {};

        if (filter === '1month') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            dateFilter.$gte = oneMonthAgo;
        } else if (filter === '1.5month') {
            const oneAndHalfMonthAgo = new Date();
            oneAndHalfMonthAgo.setDate(oneAndHalfMonthAgo.getDate() - 45);
            dateFilter.$gte = oneAndHalfMonthAgo;
        } else if (startDate || endDate) {
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        let previousBalance = 0;
        if (dateFilter.$gte) {
            const priorBills = await Bill.find({
                phone: user.phone,
                createdAt: { $lt: dateFilter.$gte }
            });
            previousBalance = priorBills.reduce((acc, b) => acc + b.totalAmount, 0);
        }

        const bills = await Bill.find(query).sort({ createdAt: 1 });
        res.render('historyinvoice', { user, bills, previousBalance, currentPage: 'home', filterRange: { startDate, endDate, filter } });
    } catch (error) {
        console.error("Invoice Error:", error);
        res.status(500).send("Error generating history invoice");
    }
};

exports.sendHistoryWhatsApp = async (req, res) => {
    try {
        const { startDate, endDate, filter } = req.query;
        const user = await User.findById(req.params.id);

        if (!user.whatsappOptIn) {
            return res.status(403).json({
                success: false,
                message: "This user has not opted in for WhatsApp notifications."
            });
        }

        let query = { phone: user.phone };
        let dateFilter = {};

        if (filter === '1month') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            dateFilter.$gte = oneMonthAgo;
        } else if (filter === '1.5month') {
            const oneAndHalfMonthAgo = new Date();
            oneAndHalfMonthAgo.setDate(oneAndHalfMonthAgo.getDate() - 45);
            dateFilter.$gte = oneAndHalfMonthAgo;
        } else if (startDate || endDate) {
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        // Calculate due amount based on filtered bills
        const filteredBills = await Bill.find(query);
        const dueAmount = filteredBills.reduce((acc, b) => acc + b.totalAmount, 0);

        // Add to queue and wait for result (or do it synchronously for immediate feedback)
        // To give "Success message from Meta", we can process it here or wait for job.
        // Let's use the worker but returning a "queued" status is not what the user wants.
        // They want the Meta response. So we'll run the service calls here.

        const protocol = req.protocol;
        const host = req.get('host');
        const appUrl = process.env.APP_URL || `${protocol}://${host}`;
        const cookies = req.cookies.auth ? { auth: req.cookies.auth } : {};

        let queryParams = new URLSearchParams();
        if (filter) queryParams.append('filter', filter);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        
        let linkParam = user._id.toString();
        if (queryParams.toString()) {
            linkParam += `?${queryParams.toString()}`;
        }

        // NEW TEMPLATE LOGIC (Malayam 'reminder' template)
        const reminderResponse = await sendReminderTemplate(user.phone, user.username, linkParam);

        res.status(200).json({
            success: true,
            message: "Statement sent successfully!",
            metaResponse: reminderResponse
        });
    } catch (error) {
        console.error("Send Statement Error:", error);
        res.status(500).json({
            success: false,
            message: "Error sending statement: " + error.message
        });
    }
};


exports.addTransaction = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const amount = parseFloat(req.body.amount);
        const type = req.body.type || 'purchase';
        const customDate = req.body.date ? new Date(req.body.date) : new Date();

        if (!user || isNaN(amount) || amount <= 0) {
            return res.status(400).send("Invalid amount. Please enter a value greater than 0.");
        }

        // If it's a payment, we store the unitPrice and amount as negative 
        // to subtract it from the total outstanding balance.
        const finalAmount = type === 'payment' ? -amount : amount;

        const bill = new Bill({
            username: user.username,
            phone: user.phone,
            type: type,
            items: [{
                item: type === 'payment' ? 'Payment Received' : 'Daily Purchase',
                quantity: 1,
                unitPrice: finalAmount,
                amount: finalAmount
            }],
            createdAt: customDate
        });

        await bill.save();
        res.redirect(`/user/${req.params.id}`);
    } catch (error) {
        console.error("Add Transaction Error:", error);
        res.status(500).send("Error adding transaction: " + error.message);
    }
};

exports.getByPhone = async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (user) {
            res.redirect(`/user/${user._id}`);
        } else {
            res.status(404).send("User not found for this transaction");
        }
    } catch (error) {
        res.status(500).send("Error locating user");
    }
};

exports.deleteBill = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.billId);
        const userId = req.params.userId;
        await Bill.findByIdAndDelete(req.params.billId);
        res.redirect(`/user/${userId}`);
    } catch (error) {
        res.status(500).send("Error deleting bill");
    }
};

exports.editBill = async (req, res) => {
    try {
        const { amount, type, date } = req.body;
        const bill = await Bill.findById(req.params.billId);

        // Calculate final amount based on type
        const finalAmount = (type || bill.type) === 'payment' ? -Math.abs(amount) : Math.abs(amount);

        bill.items[0].unitPrice = finalAmount;
        bill.items[0].amount = finalAmount;
        bill.totalAmount = finalAmount;

        await bill.save();

        if (date) {
            await Bill.collection.updateOne(
                { _id: bill._id },
                { $set: { createdAt: new Date(date) } }
            );
        }

        res.redirect(`/user/${req.params.userId}`);
    } catch (error) {
        res.status(500).send("Error updating bill");
    }
};

exports.getEditUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.render('editUser', { user, currentPage: 'home' });
    } catch (error) {
        res.status(500).send("Error loading edit page");
    }
};

exports.postEditUser = async (req, res) => {
    try {
        const { username, phone, status, dueDate, type, billNeeded, whatsappOptIn } = req.body;
        const user = await User.findById(req.params.id);

        const isOptingIn = whatsappOptIn === 'on' && !user.whatsappOptIn;

        await User.findByIdAndUpdate(req.params.id, {
            username,
            phone: normalizePhone(phone),
            status,
            dueDate: dueDate || null,
            type,
            billNeeded: billNeeded === 'true',
            whatsappOptIn: whatsappOptIn === 'on',
            whatsappOptInAt: isOptingIn ? new Date() : user.whatsappOptInAt
        });
        res.redirect(`/user/${req.params.id}`);
    } catch (error) {
        res.status(500).send("Error updating user");
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        await Bill.deleteMany({username:user.username,phone:normalizePhone(user.phone)})
        await User.deleteOne({username:user.username,phone:normalizePhone(user.phone)})
        res.redirect('/dashboard');
    } catch (error) {
        console.log(error)
        res.status(500).send("Error deleting user");
    }
};
exports.saveBillData = async (req, res) => {
    try {
        const { username, phone, date, items, totalAmount, description } = req.body;

        const newBill = new Bill({
            username,
            phone,
            items,
            totalAmount,
            description,
            createdAt: date ? new Date(date) : new Date()
        });

        const savedBill = await newBill.save();

        res.status(200).json({
            message: "Bill saved successfully",
            billId: savedBill._id
        });
    } catch (error) {
        console.error("Error saving bill data:", error);
        res.status(500).send("Error saving bill");
    }
};

exports.getViewBill = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill) return res.status(404).send("Bill not found");
        res.render('viewBill', { bill, currentPage: 'bills' });
    } catch (error) {
        res.status(500).send("Error loading bill");
    }
};

exports.downloadBillPDF = async (req, res) => {
    try {
        const billId = req.params.id;
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}/view-bill/${billId}`;

        // Get authentication cookies from the request
        const cookies = req.cookies;

        const pdfBuffer = await generatePDFBuffer(url, cookies);

        res.contentType("application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=Invoice_${billId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF Download Error:", error);
        res.status(500).send("Error generating PDF: " + error.message);
    }
};

// Normalize phone to 91 + 10 digits for consistent storage and WhatsApp API
function normalizePhone(phone) {
    if (!phone || typeof phone !== 'string') return phone;
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10) return '91' + clean;
    if (clean.length === 12 && clean.startsWith('91')) return clean;
    return clean || phone;
}

exports.addUser = async (req, res) => {
    try {
        const { username, phone, status, dueDate, type, billNeeded, whatsappOptIn } = req.body;
        const normalizedPhone = normalizePhone(phone);

        const newUser = new User({
            username: (username || '').trim(),
            phone: normalizedPhone,
            status,
            dueDate: dueDate || null,
            type,
            billNeeded: billNeeded === 'true',
            whatsappOptIn: whatsappOptIn === 'on',
            whatsappOptInAt: whatsappOptIn === 'on' ? new Date() : null
        });

        await newUser.save();



        res.render('addUser', {
            success: 'User added successfully! Tip: Ask the customer to send "HI" to our number to ensure reliable delivery.',
            error: null,
            currentPage: 'addUser'
        });

    } catch (err) {
        if(err.code == '11000' && err.keyPattern.username == 1){
            res.render('addUser', {
            success: null,
            error: 'User Exists cannot create Duplicate User',
            currentPage: 'addUser'
        });
        }
        if(err.code == '11000' && err.keyPattern.phone == 1){
            res.render('addUser', {
            success: null,
            error: 'Phone Exists cannot create Duplicate Phone',
            currentPage: 'addUser'
        });
        }
        res.render('addUser', {
            success: null,
            error: err.message,
            currentPage: 'addUser'
        });
    }
};

exports.getPublicInvoicePDF = async (req, res) => {
    try {
        const userId = req.params.id;
        const { startDate, endDate, filter } = req.query;
        const user = await User.findById(userId);
        
        if (!user) return res.status(404).send("Invoice not found.");

        const protocol = req.protocol;
        const host = req.get('host');
        
        let url = `${protocol}://${host}/user/${userId}/history/invoice`;
        
        const params = new URLSearchParams();
        if (filter) params.append('filter', filter);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (params.toString()) url += `?${params.toString()}`;

        // Use 'true' string since the authMiddleware expects req.cookies.auth === 'true'
        const cookies = { auth: 'true' };

        const pdfBuffer = await generatePDFBuffer(url, cookies);

        res.contentType("application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=Statement_${user.username}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Public PDF Generation Error:", error);
        res.status(500).send("Error generating highly requested PDF document: " + error.message);
    }
};
