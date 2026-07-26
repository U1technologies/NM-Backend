// scripts/seedComments.js
// Seeds demo BlogComment documents against whatever blog posts already exist. Does NOT touch
// any other collection. Run after scripts/seedBlogModule.js so there are posts to attach to.
//
// Run with: node scripts/seedComments.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const BlogPost = require('../models/blogPostModel');
const BlogComment = require('../models/blogCommentModel');

const FIRST_NAMES = [
  'Sarah', 'James', 'Priya', 'Michael', 'Emma', 'David', 'Aisha', 'Daniel', 'Sofia', 'Ryan',
  'Olivia', 'Carlos', 'Nina', 'Tom', 'Grace', 'Ahmed', 'Lucy', 'Kevin', 'Maria', 'Ethan',
];
const LAST_NAMES = [
  'Mitchell', 'Chen', 'Sharma', 'Brown', 'Wilson', 'Kim', 'Khan', 'Rossi', 'Novak', 'Patel',
  'Garcia', 'Lopez', 'Nguyen', 'Foster', 'Adams', 'Reed', 'Turner', 'Bailey', 'Cole', 'Ward',
];

const APPROVED_TEMPLATES = [
  "Great breakdown, this is exactly what I needed for our campaign this quarter.",
  "We tried this approach last month and saw a real lift in conversions. Nice write-up!",
  "Bookmarking this. The section on tracking setup alone was worth the read.",
  "Solid points here. Would love a follow-up post that goes deeper into the numbers.",
  "This matches what we're seeing on our end too. Thanks for putting it together.",
  "Clear and actionable — sharing this with the rest of my team.",
  "Appreciate the real examples instead of just theory. Very useful.",
  "Good timing, we were just debating this exact question internally.",
];
const PENDING_TEMPLATES = [
  "Interesting take — how does this hold up for smaller budgets though?",
  "Curious if this still applies after the recent platform policy changes.",
  "Can you share the source for that stat in the third paragraph?",
  "We're just getting started with this, any beginner resources you'd recommend?",
];
const SPAM_TEMPLATES = [
  "Check out my site for guaranteed followers and traffic!!! www.example-spam.test",
  "Make $$$ fast working from home, click my profile for details.",
  "Nice post, visit my page for free crypto signals.",
];
const TRASH_TEMPLATES = [
  "This is completely wrong and a waste of time.",
  "test test test",
];
const REPLY_TEMPLATES = [
  "Thanks for reading — glad it was useful!",
  "Good question. We'll cover that in more depth in an upcoming post.",
  "Appreciate the feedback, noted for the next revision.",
];

const pick = (arr, i) => arr[i % arr.length];
const emailFor = (first, last, i) => `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const run = async () => {
  await connectDB();

  const posts = await BlogPost.find().select('_id').lean();
  if (posts.length === 0) {
    throw new Error('No blog posts found — run scripts/seedBlogModule.js first.');
  }

  console.log('Clearing existing comments...');
  await BlogComment.deleteMany({});

  const TOTAL = 150;
  const comments = [];

  // Distribution: ~70% approved, ~15% pending, ~10% spam, ~5% trash.
  const statusPlan = [];
  for (let i = 0; i < TOTAL; i++) {
    if (i < TOTAL * 0.7) statusPlan.push('approved');
    else if (i < TOTAL * 0.85) statusPlan.push('pending');
    else if (i < TOTAL * 0.95) statusPlan.push('spam');
    else statusPlan.push('trash');
  }

  for (let i = 0; i < TOTAL; i++) {
    const post = pick(posts, i * 3 + 7);
    const first = pick(FIRST_NAMES, i);
    const last = pick(LAST_NAMES, i * 2 + 1);
    const status = statusPlan[i];

    let content;
    if (status === 'approved') content = pick(APPROVED_TEMPLATES, i);
    else if (status === 'pending') content = pick(PENDING_TEMPLATES, i);
    else if (status === 'spam') content = pick(SPAM_TEMPLATES, i);
    else content = pick(TRASH_TEMPLATES, i);

    comments.push({
      post: post._id,
      name: `${first} ${last}`,
      email: emailFor(first, last, i),
      content,
      status,
      likes: status === 'approved' ? Math.floor(Math.random() * 12) : 0,
      dislikes: status === 'approved' ? Math.floor(Math.random() * 3) : 0,
      createdAt: daysAgo(TOTAL - i),
      updatedAt: daysAgo(TOTAL - i),
    });
  }

  const created = await BlogComment.insertMany(comments);
  console.log(`Seeded ${created.length} comments.`);

  // A handful of admin replies threaded onto some of the approved top-level comments.
  const approvedSample = created.filter((c) => c.status === 'approved').slice(0, 10);
  const replies = approvedSample.map((parent, i) => ({
    post: parent.post,
    parentComment: parent._id,
    name: 'NextagMedia Team',
    email: 'noreply@nextagmedia.com',
    content: pick(REPLY_TEMPLATES, i),
    status: 'approved',
    isAdminReply: true,
    createdAt: daysAgo(TOTAL - 150 + i),
    updatedAt: daysAgo(TOTAL - 150 + i),
  }));
  await BlogComment.insertMany(replies);
  console.log(`Seeded ${replies.length} admin replies.`);

  console.log('Comment seed complete.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
