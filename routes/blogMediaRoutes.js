const express = require('express');
const { getMediaLibrary, deleteMedia } = require('../controllers/blogMediaController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.get('/', verifyToken, requirePermission('media.manage'), getMediaLibrary);
router.delete('/:id', verifyToken, requirePermission('media.manage'), deleteMedia);

module.exports = router;
