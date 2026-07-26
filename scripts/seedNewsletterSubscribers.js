// scripts/seedNewsletterSubscribers.js
// Seeds demo NewsletterSubscriber documents. Does NOT touch any other collection.
//
// Run with: node scripts/seedNewsletterSubscribers.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const NewsletterSubscriber = require('../models/newsletterSubscriberModel');

const SOURCES = ['popup', 'inline', 'footer', 'exit-intent', 'sticky'];
const DOMAINS = ['example.com', 'example.org', 'example.net', 'mail.example.com'];

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const run = async () => {
  await connectDB();

  console.log('Clearing existing newsletter subscribers...');
  await NewsletterSubscriber.deleteMany({});

  const TOTAL = 500;
  const HORIZON_DAYS = 180; // spread signups over the last ~6 months for a believable growth curve
  const subscribers = [];

  for (let i = 0; i < TOTAL; i++) {
    // Skews recent — more signups in the last 60 days than the first 120, like real growth.
    const dayOffset = Math.floor(HORIZON_DAYS * Math.pow(Math.random(), 1.6));
    const source = SOURCES[i % SOURCES.length];
    const domain = DOMAINS[i % DOMAINS.length];
    const subscribedAt = daysAgo(dayOffset);

    subscribers.push({
      email: `subscriber${i + 1}@${domain}`,
      source,
      subscribedAt,
      createdAt: subscribedAt,
      updatedAt: subscribedAt,
    });
  }

  const created = await NewsletterSubscriber.insertMany(subscribers);
  console.log(`Seeded ${created.length} newsletter subscribers.`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
