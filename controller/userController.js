const User = require('../model/User');

exports.getDashboard = async (req, res) => {
    try {
        const monthlyUsers = await User.find({ type: 'monthly' });
        const fixedUsers = await User.find({ type: 'fixed' });
        const uncertainUsers = await User.find({ type: 'uncertain' });

        res.render('index', {
            monthlyCount: monthlyUsers.length,
            fixedCount: fixedUsers.length,
            uncertainCount: uncertainUsers.length,
            username: "admin" // Hardcoded for display as requested
        });
    } catch (error) {
        res.status(500).send("Error loading dashboard");
    }
};

exports.getAddUser = (req, res) => {
    res.render('addUser', { success: null, error: null });
};

exports.postAddUser = async (req, res) => {
    try {
        const { username, phone, status, dueDate, type } = req.body;
        const newUser = new User({
            username,
            phone,
            status,
            dueDate: dueDate || null,
            type
        });
        await newUser.save();
        res.render('addUser', { success: 'User added successfully!', error: null });
    } catch (err) {
        res.render('addUser', { success: null, error: err.message });
    }
};
