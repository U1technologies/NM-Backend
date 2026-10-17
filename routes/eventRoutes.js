const express = require('express');
const {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvents,
  getEventBySlug,
  getEventById,
  uploadEventImage,
} = require('../controllers/eventController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { requireAnyPermission } = require('../middleware/requirePermission');
const uploadImage = require('../utils/multerEventImage');

const router = express.Router();
const CAN_WRITE = requireAnyPermission('events.create', 'events.edit');

// Literal routes before the `/:slug` catch-all, same reasoning as blogPostRoutes.js.
router.get('/admin/:id', verifyToken, requirePermission('events.view'), getEventById);
router.post('/upload-image', verifyToken, CAN_WRITE, uploadImage.single('image'), uploadEventImage);
router.post('/', verifyToken, requirePermission('events.create'), createEvent);

router.get('/', getEvents);
router.get('/:slug', getEventBySlug);

router.put('/:id', verifyToken, requirePermission('events.edit'), updateEvent);
router.delete('/:id', verifyToken, requirePermission('events.delete'), deleteEvent);

module.exports = router;
