const express = require('express');
const { getRevisionsForPost, getRevisionById, restoreRevision } = require('../controllers/blogRevisionController');
const verifyToken = require('../middleware/authMiddleware');
const { requireAnyPermission } = require('../middleware/requirePermission');

const router = express.Router();
const CAN_EDIT = requireAnyPermission('posts.edit', 'posts.editOwn');

router.get('/post/:postId', verifyToken, CAN_EDIT, getRevisionsForPost);
router.get('/:id', verifyToken, CAN_EDIT, getRevisionById);
router.post('/:id/restore', verifyToken, CAN_EDIT, restoreRevision);

module.exports = router;
