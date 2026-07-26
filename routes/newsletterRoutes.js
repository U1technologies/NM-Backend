const express = require('express');
const multer = require('multer');
const {
  subscribe,
  getSubscribers,
  deleteSubscriber,
  exportSubscribers,
  importSubscribers,
  getSubscriberGrowth,
  getSettings,
  updateSettings,
  getPublicPopupSettings,
} = require('../controllers/newsletterController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { writeLimiter, pingLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
// CSV import is parsed in-memory (never written to disk/Cloudinary) — small text files only.
const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const CAN_MANAGE = requirePermission('newsletter.manage');

router.post('/subscribe', writeLimiter, subscribe);
router.get('/popup-settings', pingLimiter, getPublicPopupSettings);
router.get('/', verifyToken, CAN_MANAGE, getSubscribers);
router.get('/export', verifyToken, CAN_MANAGE, exportSubscribers);
router.post('/import', verifyToken, CAN_MANAGE, uploadCsv.single('file'), importSubscribers);
router.get('/growth', verifyToken, CAN_MANAGE, getSubscriberGrowth);
router.get('/settings', verifyToken, CAN_MANAGE, getSettings);
router.put('/settings', verifyToken, CAN_MANAGE, updateSettings);
router.delete('/:id', verifyToken, CAN_MANAGE, deleteSubscriber);

module.exports = router;
