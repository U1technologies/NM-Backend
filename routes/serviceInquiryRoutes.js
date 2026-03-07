const express = require('express');
const { storeServiceInquiry, getServiceInquiries, updateInquiryRemark } = require('../controllers/serviceInquiryController');

const router = express.Router();

router.post('/', storeServiceInquiry);
router.get('/', getServiceInquiries);
router.patch('/:id/remark', updateInquiryRemark);

module.exports = router;
