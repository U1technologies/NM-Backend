const express = require('express');
const { storeContact, getContacts } = require('../controllers/contactController');

const router = express.Router();

router.post('/', storeContact);
router.get('/', getContacts);

module.exports = router;
