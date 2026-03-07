const express = require('express');
const { storeContact, getContacts, updateRemark } = require('../controllers/contactController');

const router = express.Router();

router.post('/', storeContact);
router.get('/', getContacts);
router.patch('/:id/remark', updateRemark);

module.exports = router;
