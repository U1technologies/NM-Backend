const User = require('../models/userModel');
const Role = require('../models/roleModel');
const logActivity = require('../utils/activityLogger');

const POPULATE_ROLE = 'name permissions isSystemRole';

// @desc List all admin/team users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('role', POPULATE_ROLE).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Invite/create a new team member with an assigned role
const createUserAccount = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email?.trim() || !password || !role) {
      return res.status(400).json({ success: false, message: 'email, password, and role are required' });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with that email already exists' });
    }

    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.create({ email: email.trim().toLowerCase(), password, name: name || '', role });
    const populated = await User.findById(user._id).select('-password').populate('role', POPULATE_ROLE);
    logActivity({ req, action: 'user.created', targetType: 'User', targetId: user._id, targetLabel: user.email });
    return res.status(201).json({ success: true, message: 'Team member created', data: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update a user's name, role, or active status
const updateUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.role !== undefined) {
      const roleDoc = await Role.findById(req.body.role);
      if (!roleDoc) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      user.role = req.body.role;
    }
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.active !== undefined) {
      if (String(user._id) === String(req.currentUser._id) && req.body.active === false) {
        return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
      }
      user.active = req.body.active;
    }

    await user.save();
    const populated = await User.findById(user._id).select('-password').populate('role', POPULATE_ROLE);
    const changedFields = {};
    if (req.body.role !== undefined) changedFields.role = req.body.role;
    if (req.body.name !== undefined) changedFields.name = req.body.name;
    if (req.body.active !== undefined) changedFields.active = req.body.active;
    logActivity({ req, action: 'user.updated', targetType: 'User', targetId: user._id, targetLabel: user.email, metadata: changedFields });
    return res.status(200).json({ success: true, message: 'User updated', data: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Remove a team member's account
const deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (String(id) === String(req.currentUser._id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const deletedUserEmail = user.email;
    await user.deleteOne();
    logActivity({ req, action: 'user.deleted', targetType: 'User', targetId: user._id, targetLabel: deletedUserEmail });
    return res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsers, createUserAccount, updateUserAccount, deleteUserAccount };
