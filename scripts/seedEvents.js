// scripts/seedEvents.js
// One-time import of the original hand-written events (the former ALL_EVENTS list in the
// website's text.js) into the `events` collection, so they can be edited from the admin panel.
// Safe to re-run: matches on slug and only inserts missing events, never overwriting edits.
// Touches ONLY the `events` collection.
//
// Run with: node scripts/seedEvents.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Event = require('../models/eventModel');
const events = require('./data/events-seed.json');

const run = async () => {
  await connectDB();
  for (const event of events) {
    const result = await Event.updateOne({ slug: event.slug }, { $setOnInsert: event }, { upsert: true });
    console.log(`  - ${event.slug}: ${result.upsertedCount ? 'inserted' : 'already exists, left unchanged'}`);
  }
  console.log(`Events seed complete (${await Event.countDocuments()} events in database).`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Events seed failed:', error.message);
  process.exit(1);
});
