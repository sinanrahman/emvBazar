const bcrypt = require('bcryptjs');

const HARDCODED_USER = {
    username: "admin",
    passwordHash : process.env.PASSWORDHASH
};  

exports.getLogin = (req, res) => {
    res.render('login', { error: null });
};

exports.postLogin = async (req, res) => {
    const { username, password } = req.body;
    if (username === HARDCODED_USER.username) {
        const isMatch = await bcrypt.compare(password, HARDCODED_USER.passwordHash);
        if (isMatch) {
            res.cookie('auth', 'true', { httpOnly: true, maxAge: 86400000 }); // 24 hours in ms
            return res.redirect('/dashboard');
        }
    }
    res.render('login', { error: 'Invalid username or password' });
};

exports.logout = (req, res) => {
    res.cookie('auth', 'false')
    res.cookie('token', null)

    res.clearCookie('auth', {
        httpOnly: true
    });
    res.clearCookie('token')
    res.redirect('/login');
};
