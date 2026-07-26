const express = require('express');
const {
  createComment,
  getPublicCommentsForPost,
  getComments,
  moderateComment,
  replyToComment,
  blockCommenter,
  deleteComment,
  likeComment,
  dislikeComment,
} = require('../controllers/blogCommentController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { writeLimiter, pingLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
const CAN_MODERATE = requirePermission('comments.moderate');

router.post('/', writeLimiter, createComment);
router.get('/post/:slug', getPublicCommentsForPost);
router.get('/', verifyToken, CAN_MODERATE, getComments);
router.patch('/:id/status', verifyToken, CAN_MODERATE, moderateComment);
router.post('/:id/reply', verifyToken, CAN_MODERATE, replyToComment);
router.post('/:id/block', verifyToken, CAN_MODERATE, blockCommenter);
router.post('/:id/like', pingLimiter, likeComment);
router.post('/:id/dislike', pingLimiter, dislikeComment);
router.delete('/:id', verifyToken, CAN_MODERATE, deleteComment);

module.exports = router;
