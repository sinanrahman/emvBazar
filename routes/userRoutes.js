const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, userController.getDashboard);
router.get('/add-user', authMiddleware, userController.getAddUser);
router.post('/add-user', authMiddleware, userController.postAddUser);

module.exports = router;
