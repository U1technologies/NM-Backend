const express = require('express');
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.get('/', verifyToken, requirePermission('users.manage'), getRoles);
router.post('/', verifyToken, requirePermission('users.manage'), createRole);
router.put('/:id', verifyToken, requirePermission('users.manage'), updateRole);
router.delete('/:id', verifyToken, requirePermission('users.manage'), deleteRole);

module.exports = router;
