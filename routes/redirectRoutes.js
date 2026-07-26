const express = require('express');
const multer = require('multer');
const {
  getRedirects,
  getActiveRedirects,
  recordRedirectHit,
  createRedirect,
  updateRedirect,
  deleteRedirect,
  exportRedirects,
  importRedirects,
  logNotFound,
  getNotFoundLogs,
} = require('../controllers/redirectController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { pingLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const CAN_MANAGE = requirePermission('redirects.manage');

// Public — read by the frontend's edge middleware and the custom 404 page.
router.get('/active', getActiveRedirects);
router.post('/hit', pingLimiter, recordRedirectHit);
router.post('/log-404', pingLimiter, logNotFound);

router.get('/', verifyToken, CAN_MANAGE, getRedirects);
router.get('/404-logs', verifyToken, CAN_MANAGE, getNotFoundLogs);
router.get('/export', verifyToken, CAN_MANAGE, exportRedirects);
router.post('/import', verifyToken, CAN_MANAGE, uploadCsv.single('file'), importRedirects);
router.post('/', verifyToken, CAN_MANAGE, createRedirect);
router.put('/:id', verifyToken, CAN_MANAGE, updateRedirect);
router.delete('/:id', verifyToken, CAN_MANAGE, deleteRedirect);

module.exports = router;
