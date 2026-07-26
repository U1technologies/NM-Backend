const mongoose = require('mongoose');

// Every permission key this app enforces. Keeping it as an explicit list (rather than deriving
// it from routes) makes the Roles & Permissions admin screen able to render every available
// permission even for ones a custom role hasn't picked up yet.
const ALL_PERMISSIONS = [
  'posts.view', 'posts.create', 'posts.editOwn', 'posts.edit', 'posts.delete', 'posts.publish',
  'categories.manage', 'tags.manage', 'authors.manage',
  'comments.moderate',
  'newsletter.manage',
  'media.manage',
  'seo.manage',
  'analytics.view',
  'redirects.manage',
  'activityLogs.view',
  'users.manage',
  'settings.manage',
];

const roleSchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    permissions: { type: [String], default: [], enum: ALL_PERMISSIONS },
    // System roles (seeded defaults) can be edited but not deleted or renamed away from their
    // seed identity — protects the app from ending up with zero valid roles.
    isSystemRole: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
module.exports.ALL_PERMISSIONS = ALL_PERMISSIONS;
