const express = require('express');
const { adminSearch } = require('../controllers/adminSearchController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, adminSearch);

module.exports = router;
