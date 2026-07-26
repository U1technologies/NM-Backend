const express = require('express');
const { getSeoOverview } = require('../controllers/seoManagerController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.get('/overview', verifyToken, requirePermission('seo.manage'), getSeoOverview);

module.exports = router;
