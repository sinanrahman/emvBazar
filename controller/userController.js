const User = require('../model/User');
const Bill = require('../model/Bill');

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

exports.postAddUser = async (req, res) => {
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
        res.render('addUser', { success: 'User added successfully!', error: null, currentPage: 'addUser' });
    } catch (err) {
        res.render('addUser', { success: null, error: err.message, currentPage: 'addUser' });
    }
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

exports.addTransaction = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const amount = parseFloat(req.body.amount);
        const customDate = req.body.date ? new Date(req.body.date) : new Date();

        if (!user || isNaN(amount) || amount <= 0) {
            return res.status(400).send("Invalid amount. Please enter a value greater than 0.");
        }

        const bill = new Bill({
            username: user.username,
            phone: user.phone,
            items: [{
                item: 'Daily Purchase',
                quantity: 1,
                unitPrice: amount,
                amount: amount
            }],
            createdAt: customDate // Override timestamp if provided
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
        const { amount } = req.body;
        const bill = await Bill.findById(req.params.billId);

        bill.items[0].unitPrice = amount;
        bill.items[0].amount = amount;
        bill.totalAmount = amount;

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
        res.redirect('/');
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
        const puppeteer = require('puppeteer-core');
        const billId = req.params.id;

        // Find Chrome executable path (common Windows paths)
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ];
        const fs = require('fs');
        const executablePath = chromePaths.find(path => fs.existsSync(path));

        if (!executablePath) {
            return res.status(500).send("Chrome not found on server for PDF generation. Please use 'Print' manually.");
        }

        const browser = await puppeteer.launch({
            executablePath: executablePath,
            args: ['--no-sandbox']
        });
        const page = await browser.newPage();

        // Use full URL to the view page
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}/view-bill/${billId}`;

        // Set cookie for auth since it's an authenticated route
        const cookies = req.cookies;
        if (cookies.token) {
            await page.setCookie({
                name: 'token',
                value: cookies.token,
                domain: host.split(':')[0],
                path: '/'
            });
        }

        await page.goto(url, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
        });

        await browser.close();

        res.contentType("application/pdf");
        res.send(pdf);
    } catch (error) {
        console.error("PDF Error:", error);
        res.status(500).send("Error generating PDF: " + error.message);
    }
};
