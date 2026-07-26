const express = require('express');
const { getActivityLogs } = require('../controllers/activityLogController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.get('/', verifyToken, requirePermission('activityLogs.view'), getActivityLogs);

module.exports = router;
