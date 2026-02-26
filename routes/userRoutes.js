const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const authMiddleware = require('../middleware/auth');

router.get('/', userController.getHomePage);
router.get('/dashboard', authMiddleware, userController.getDashboard);
router.get('/users/:type', authMiddleware, userController.getByType);
router.get('/user/:id', authMiddleware, userController.getUserDetails);
router.get('/user/:id/history', authMiddleware, userController.getUserHistory);
router.get('/user/:id/history/invoice', authMiddleware, userController.getHistoryInvoice);
router.post('/user/:id/transaction', authMiddleware, userController.addTransaction);
router.post('/user/:userId/bill/:billId/delete', authMiddleware, userController.deleteBill);
router.post('/user/:userId/bill/:billId/edit', authMiddleware, userController.editBill);
router.get('/user/:id/edit', authMiddleware, userController.getEditUser);
router.post('/user/:id/edit', authMiddleware, userController.postEditUser);
router.post('/user/:id/delete', authMiddleware, userController.deleteUser);
router.get('/add-user', authMiddleware, userController.getAddUser);
router.post('/add-user', authMiddleware, userController.addUser);
router.get('/bills', authMiddleware, userController.getBills);
router.get('/user-by-phone/:phone', authMiddleware, userController.getByPhone);
router.post('/api/save-bill', authMiddleware, userController.saveBillData);
router.get('/view-bill/:id', authMiddleware, userController.getViewBill);
router.get('/download-bill/:id', authMiddleware, userController.downloadBillPDF);

module.exports = router;
