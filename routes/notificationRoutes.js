const express = require('express');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, getNotifications);
router.patch('/read-all', verifyToken, markAllAsRead);
router.patch('/:id/read', verifyToken, markAsRead);

module.exports = router;
