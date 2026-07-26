const Offer = require('../models/offerModel');

const OFFER_FIELDS = [
  'name', 'image', 'bannerImage', 'previewUrl', 'category', 'country', 'platform', 'model', 'payout', 'description', 'ctaLabel',
  'rating', 'reviewCount', 'about', 'whyPromote', 'whyPromoteList',
  'whoShouldPromote', 'trafficRules', 'complianceNote', 'trackingFlow',
  'promotionalTips', 'paymentMethods', 'faqs',
];

// @desc Create a new offer
const createOffer = async (req, res) => {
  try {
    const requiredFields = {
      name: req.body.name,
      category: req.body.category,
      country: req.body.country,
      platform: req.body.platform,
      model: req.body.model,
      payout: req.body.payout,
      description: req.body.description,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null || value === "") {
        return res.status(400).json({
          success: false,
          message: `Field "${key}" is required and missing!`,
        });
      }
    }

    const offerData = {};
    OFFER_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        offerData[field] = req.body[field];
      }
    });

    const offer = await Offer.create(offerData);

    return res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update an existing offer
const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    OFFER_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        offer[field] = req.body[field];
      }
    });

    await offer.save();
    return res.status(200).json({ success: true, message: 'Offer updated successfully', data: offer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete an offer
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    await offer.deleteOne();
    return res.status(200).json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all offers
const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: offers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get a single offer by id
const getOfferById = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    return res.status(200).json({ success: true, data: offer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Upload an offer banner/logo image to Cloudinary and return its URL
const uploadOfferImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    return res.status(201).json({ success: true, data: { url: req.file.path } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createOffer, updateOffer, deleteOffer, getOffers, getOfferById, uploadOfferImage };
