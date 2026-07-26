const express = require('express');
const { createOffer, updateOffer, deleteOffer, getOffers, getOfferById, uploadOfferImage } = require('../controllers/offerController');
const verifyToken = require('../middleware/authMiddleware');
const uploadImage = require('../utils/multerImage');

const router = express.Router();

router.get('/', getOffers);
router.get('/:id', getOfferById);
router.post('/', verifyToken, createOffer);
router.post('/upload-image', verifyToken, uploadImage.single('image'), uploadOfferImage);
router.put('/:id', verifyToken, updateOffer);
router.delete('/:id', verifyToken, deleteOffer);

module.exports = router;
