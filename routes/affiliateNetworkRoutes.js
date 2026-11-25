const express = require('express');
const { listNetworks, saveCredentials, deleteCredentials, getNetworkOffers } = require('../controllers/affiliateNetworkController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { writeLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
const CAN_MANAGE = requirePermission('settings.manage');

router.get('/', verifyToken, CAN_MANAGE, listNetworks);
router.put('/:network/credentials', writeLimiter, verifyToken, CAN_MANAGE, saveCredentials);
router.delete('/:network/credentials', verifyToken, CAN_MANAGE, deleteCredentials);
router.get('/:network/offers', verifyToken, CAN_MANAGE, getNetworkOffers);

module.exports = router;
