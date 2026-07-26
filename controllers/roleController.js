const Role = require('../models/roleModel');
const User = require('../models/userModel');
const logActivity = require('../utils/activityLogger');

const { ALL_PERMISSIONS } = Role;

// @desc List every role, with how many users currently hold it
const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 }).lean();
    const counts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const countByRoleId = new Map(counts.map((c) => [String(c._id), c.count]));

    const data = roles.map((role) => ({ ...role, userCount: countByRoleId.get(String(role._id)) || 0 }));
    return res.status(200).json({ success: true, data, meta: { allPermissions: ALL_PERMISSIONS } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create a custom role
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }
    const invalid = (permissions || []).filter((p) => !ALL_PERMISSIONS.includes(p));
    if (invalid.length) {
      return res.status(400).json({ success: false, message: `Unknown permission(s): ${invalid.join(', ')}` });
    }

    const role = await Role.create({ name: name.trim(), description: description || '', permissions: permissions || [] });
    logActivity({ req, action: 'role.created', targetType: 'Role', targetId: role._id, targetLabel: role.name });
    return res.status(201).json({ success: true, message: 'Role created', data: role });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A role with that name already exists' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update a role's description/permissions (system roles can be edited, not renamed/deleted)
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (req.body.permissions !== undefined) {
      const invalid = req.body.permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
      if (invalid.length) {
        return res.status(400).json({ success: false, message: `Unknown permission(s): ${invalid.join(', ')}` });
      }
      role.permissions = req.body.permissions;
    }
    if (req.body.description !== undefined) role.description = req.body.description;
    if (req.body.name !== undefined && !role.isSystemRole) role.name = req.body.name;

    await role.save();
    const roleUpdateMetadata = {};
    if (req.body.permissions !== undefined) roleUpdateMetadata.permissions = role.permissions;
    logActivity({ req, action: 'role.updated', targetType: 'Role', targetId: role._id, targetLabel: role.name, metadata: roleUpdateMetadata });
    return res.status(200).json({ success: true, message: 'Role updated', data: role });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a custom role (system roles are protected; roles still in use are protected)
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    if (role.isSystemRole) {
      return res.status(409).json({ success: false, message: 'Built-in roles cannot be deleted' });
    }
    const inUse = await User.countDocuments({ role: id });
    if (inUse > 0) {
      return res.status(409).json({ success: false, message: `${inUse} user(s) still have this role. Reassign them first.` });
    }

    const deletedRoleName = role.name;
    await role.deleteOne();
    logActivity({ req, action: 'role.deleted', targetType: 'Role', targetId: role._id, targetLabel: deletedRoleName });
    return res.status(200).json({ success: true, message: 'Role deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getRoles, createRole, updateRole, deleteRole };
