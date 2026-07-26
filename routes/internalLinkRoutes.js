const express = require('express');
const { getInternalLinkOverview } = require('../controllers/internalLinkController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.get('/overview', verifyToken, requirePermission('seo.manage'), getInternalLinkOverview);

module.exports = router;
