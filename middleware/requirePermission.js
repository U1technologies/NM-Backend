const User = require('../models/userModel');

// A user created before Roles & Permissions existed (or whose role was deleted) has no role
// assigned — treated as full access rather than locked out, so this feature can be layered
// onto existing routes without breaking the current admin's workflow.
const hasPermission = (user, permissionKey) => {
  const permissions = user?.role?.permissions;
  return !permissions || permissions.includes(permissionKey);
};

// Runs AFTER verifyToken. Looks up the acting user (with populated role), enforces
// `permissionKey`, and attaches the full user document as req.currentUser so downstream
// controllers can do finer-grained checks (e.g. "editOwn" vs "edit").
const requirePermission = (permissionKey) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('role').select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (user.active === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }
    if (!hasPermission(user, permissionKey)) {
      return res.status(403).json({ success: false, message: `You don't have permission to do this (requires "${permissionKey}")` });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Populates req.currentUser without gating on any single permission — used on routes like
// "update a post" where the real check is nuanced (edit any vs. edit-own-only) and has to
// happen inside the controller once it has loaded the specific record being touched.
const attachCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('role').select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (user.active === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// True if the user holds ANY of the given permission keys — for routes where more than one
// permission can unlock access (e.g. either "edit" or "editOwn" gets you past the door; the
// finer-grained own-vs-any distinction is then made inside the controller).
const requireAnyPermission = (...permissionKeys) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('role').select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (user.active === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }
    if (!permissionKeys.some((key) => hasPermission(user, key))) {
      return res.status(403).json({ success: false, message: `You don't have permission to do this (requires one of: ${permissionKeys.join(', ')})` });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = requirePermission;
module.exports.hasPermission = hasPermission;
module.exports.attachCurrentUser = attachCurrentUser;
module.exports.requireAnyPermission = requireAnyPermission;
