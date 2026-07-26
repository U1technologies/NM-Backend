// scripts/seedRolesAndPermissions.js
// Creates the default system roles and assigns the existing bootstrap admin user (identified by
// ADMIN_EMAIL) to Super Admin, so they keep full access once Roles & Permissions is enforced.
// Safe to re-run: upserts roles by name, only assigns the admin's role if they don't have one.
//
// Run with: ADMIN_EMAIL=admin@nextagmedia.com node scripts/seedRolesAndPermissions.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Role = require('../models/roleModel');
const User = require('../models/userModel');

const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    description: 'Full access to every module, including user and role management.',
    permissions: Role.ALL_PERMISSIONS,
    isSystemRole: true,
  },
  {
    name: 'Admin',
    description: 'Full access to content and settings, excluding user/role management.',
    permissions: Role.ALL_PERMISSIONS.filter((p) => p !== 'users.manage'),
    isSystemRole: true,
  },
  {
    name: 'SEO Manager',
    description: 'Manages SEO fields, redirects, and analytics across the blog.',
    permissions: ['seo.manage', 'analytics.view', 'redirects.manage', 'posts.view', 'posts.edit'],
    isSystemRole: true,
  },
  {
    name: 'Content Manager',
    description: 'Full control over posts, categories, tags, authors, comments, and media.',
    permissions: [
      'posts.view', 'posts.create', 'posts.edit', 'posts.delete', 'posts.publish',
      'categories.manage', 'tags.manage', 'authors.manage', 'comments.moderate', 'media.manage',
    ],
    isSystemRole: true,
  },
  {
    name: 'Editor',
    description: 'Can create, edit, and publish any post, and moderate comments.',
    permissions: ['posts.view', 'posts.create', 'posts.edit', 'posts.publish', 'comments.moderate'],
    isSystemRole: true,
  },
  {
    name: 'Author',
    description: 'Can create and edit their own posts, but cannot publish or edit others\' work.',
    permissions: ['posts.view', 'posts.create', 'posts.editOwn'],
    isSystemRole: true,
  },
  {
    name: 'Reviewer',
    description: 'Reviews and edits submitted posts and moderates comments, but cannot publish.',
    permissions: ['posts.view', 'posts.edit', 'comments.moderate'],
    isSystemRole: true,
  },
  {
    name: 'Support',
    description: 'Handles reader-facing comments and newsletter subscriber support.',
    permissions: ['comments.moderate', 'newsletter.manage'],
    isSystemRole: true,
  },
];

const run = async () => {
  await connectDB();

  console.log('Seeding default roles...');
  const roleByName = new Map();
  for (const roleData of DEFAULT_ROLES) {
    const role = await Role.findOneAndUpdate(
      { name: roleData.name },
      { $set: roleData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    roleByName.set(role.name, role);
    console.log(`  - ${role.name} (${role.permissions.length} permissions)`);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const admin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!admin) {
      console.log(`No user found with email ${adminEmail} — skipping role assignment.`);
    } else if (admin.role) {
      console.log(`${adminEmail} already has a role assigned — leaving it as-is.`);
    } else {
      admin.role = roleByName.get('Super Admin')._id;
      await admin.save();
      console.log(`Assigned Super Admin to ${adminEmail}.`);
    }
  } else {
    console.log('No ADMIN_EMAIL provided — skipping bootstrap admin role assignment.');
  }

  console.log('Roles & Permissions seed complete.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
