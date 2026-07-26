const express = require('express');
const { getUsers, createUserAccount, updateUserAccount, deleteUserAccount } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.get('/', verifyToken, requirePermission('users.manage'), getUsers);
router.post('/', verifyToken, requirePermission('users.manage'), createUserAccount);
router.put('/:id', verifyToken, requirePermission('users.manage'), updateUserAccount);
router.delete('/:id', verifyToken, requirePermission('users.manage'), deleteUserAccount);

module.exports = router;
