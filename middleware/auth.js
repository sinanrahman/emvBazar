const authMiddleware = (req, res, next) => {
    const token = req.cookies.auth;
    if (token === 'true') {
        next();
    } else {
        res.redirect('/login');
    }
};

module.exports = authMiddleware;
