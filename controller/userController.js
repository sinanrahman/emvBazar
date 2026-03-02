const User = require('../model/User');
const Bill = require('../model/Bill');
const { scheduleOneMinuteReminder } = require('./messageController');
const billQueue = require('../queues/billQueue');
const { generatePDFBuffer } = require('../utils/pdfGenerator');

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
        const bills = await Bill.find({ phone: user.phone });
        res.render('userDetails', { user, bills, currentPage: 'home' });
    } catch (error) {
        res.status(500).send("Error loading customer details");
    }
};

exports.getUserHistory = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const bills = await Bill.find({ phone: user.phone }).sort({ createdAt: -1 });
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

        const bills = await Bill.find(query).sort({ createdAt: 1 });
        res.render('historyinvoice', { user, bills, currentPage: 'home', filterRange: { startDate, endDate, filter } });
    } catch (error) {
        console.error("Invoice Error:", error);
        res.status(500).send("Error generating history invoice");
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
        const { amount, type } = req.body;
        const bill = await Bill.findById(req.params.billId);

        // Calculate final amount based on type
        const finalAmount = (type || bill.type) === 'payment' ? -Math.abs(amount) : Math.abs(amount);

        bill.items[0].unitPrice = finalAmount;
        bill.items[0].amount = finalAmount;
        bill.totalAmount = finalAmount;

        await bill.save();
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
        const { username, phone, status, dueDate, type, billNeeded } = req.body;
        await User.findByIdAndUpdate(req.params.id, {
            username,
            phone,
            status,
            dueDate: dueDate || null,
            type,
            billNeeded: billNeeded === 'true'
        });
        res.redirect(`/user/${req.params.id}`);
    } catch (error) {
        res.status(500).send("Error updating user");
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/dashboard');
    } catch (error) {
        res.status(500).send("Error deleting user");
    }
};
exports.saveBillData = async (req, res) => {
    try {
        const { username, phone, date, items, totalAmount } = req.body;

        const newBill = new Bill({
            username,
            phone,
            items,
            totalAmount,
            createdAt: date ? new Date(date) : new Date()
        });

        const savedBill = await newBill.save();

        // Add to queue for WhatsApp delivery
        // We pass the phone, the saved bill ID, and the admin's token for auth
        // Use an environment variable for APP_URL (e.g., https://emv-bazar.onrender.com)
        await billQueue.add('sendBill', {
            billId: savedBill._id.toString(),
            phone: phone,
            adminAuth: req.cookies.auth, // Match the cookie name 'auth'
            appUrl: process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        });

        res.status(200).json({
            message: "Bill saved successfully and queued for WhatsApp delivery",
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

exports.addUser = async (req, res) => {
    try {
        const { username, phone, status, dueDate, type, billNeeded } = req.body;

        const newUser = new User({
            username,
            phone,
            status,
            dueDate: dueDate || null,
            type,
            billNeeded: billNeeded === 'true'
        });

        await newUser.save();

        if (newUser.dueDate) {
            await scheduleOneMinuteReminder(newUser);
        }

        res.render('addUser', {
            success: 'User added successfully!',
            error: null,
            currentPage: 'addUser'
        });

    } catch (err) {
        res.render('addUser', {
            success: null,
            error: err.message,
            currentPage: 'addUser'
        });
    }
};
