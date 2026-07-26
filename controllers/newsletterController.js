const { Parser: CsvParser } = require('json2csv');
const NewsletterSubscriber = require('../models/newsletterSubscriberModel');
const NewsletterSettings = require('../models/newsletterSettingsModel');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');
const notify = require('../utils/notifier');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = ['popup', 'inline', 'footer', 'exit-intent', 'sticky'];
const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

// @desc Subscribe an email to the blog newsletter
const subscribe = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const source = VALID_SOURCES.includes(req.body.source) ? req.body.source : 'inline';

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }

    const existing = await NewsletterSubscriber.findOne({ email });
    if (existing) {
      return res.status(200).json({ success: true, message: "You're already subscribed!", data: existing });
    }

    const subscriber = await NewsletterSubscriber.create({ email, source });

    const totalSubscribers = await NewsletterSubscriber.countDocuments();
    if (MILESTONES.includes(totalSubscribers)) {
      notify({ type: 'newsletter.milestone', title: 'Newsletter milestone reached', message: `You just hit ${totalSubscribers} newsletter subscribers!`, link: 'newsletter' });
    }

    return res.status(201).json({ success: true, message: 'Subscribed successfully', data: subscriber });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc List newsletter subscribers — admin only, since email addresses are PII
const getSubscribers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.q?.trim()) {
      filter.email = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const [subscribers, total] = await Promise.all([
      NewsletterSubscriber.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      NewsletterSubscriber.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { subscribers, pagination: buildPaginationMeta(page, limit, total) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Remove a subscriber (unsubscribe from the admin side)
const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await NewsletterSubscriber.findById(id);
    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }
    await subscriber.deleteOne();
    logActivity({
      req,
      action: 'newsletter.subscriber_removed',
      targetType: 'NewsletterSubscriber',
      targetId: subscriber._id,
      targetLabel: subscriber.email,
    });
    return res.status(200).json({ success: true, message: 'Subscriber removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Export all subscribers as a CSV download
const exportSubscribers = async (req, res) => {
  try {
    const subscribers = await NewsletterSubscriber.find().sort({ createdAt: -1 }).lean();
    const parser = new CsvParser({ fields: ['email', 'source', 'subscribedAt', 'createdAt'] });
    const csv = parser.parse(subscribers);

    res.header('Content-Type', 'text/csv');
    res.attachment(`newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Minimal RFC4180-ish line splitter — good enough for a simple email/source export-then-reimport
// round trip; doesn't handle exotic edge cases like newlines embedded inside quoted fields.
const parseCsvLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
};

// @desc Bulk-import subscribers from an uploaded CSV (columns: email, source — source optional)
const importSubscribers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A CSV file is required' });
    }

    const text = req.file.buffer.toString('utf-8').trim();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV file has no data rows' });
    }

    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const emailIdx = header.indexOf('email');
    if (emailIdx === -1) {
      return res.status(400).json({ success: false, message: 'CSV must have an "email" column' });
    }
    const sourceIdx = header.indexOf('source');

    let created = 0;
    let skipped = 0;
    for (const line of lines.slice(1)) {
      const fields = parseCsvLine(line);
      const email = fields[emailIdx]?.trim().toLowerCase();
      if (!email || !EMAIL_REGEX.test(email)) {
        skipped += 1;
        continue;
      }
      const source = sourceIdx !== -1 && VALID_SOURCES.includes(fields[sourceIdx]) ? fields[sourceIdx] : 'inline';

      const existing = await NewsletterSubscriber.findOne({ email });
      if (existing) {
        skipped += 1;
        continue;
      }
      await NewsletterSubscriber.create({ email, source });
      created += 1;
    }

    logActivity({ req, action: 'newsletter.subscribers_imported', metadata: { created, skipped } });
    return res.status(200).json({ success: true, message: `Imported ${created} subscriber(s), skipped ${skipped}`, data: { created, skipped } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Daily subscriber growth for the last N days (default 90) — powers the growth chart
const getSubscriberGrowth = async (req, res) => {
  try {
    const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 90));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await NewsletterSubscriber.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const countByDay = new Map(rows.map((r) => [r._id, r.count]));
    const series = [];
    let running = await NewsletterSubscriber.countDocuments({ createdAt: { $lt: since } });
    for (let i = 0; i < days; i++) {
      const date = new Date(since.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const newSubs = countByDay.get(date) || 0;
      running += newSubs;
      series.push({ date, newSubscribers: newSubs, totalSubscribers: running });
    }

    return res.status(200).json({ success: true, data: series });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get the singleton newsletter settings doc (creating defaults on first access)
const getSettings = async (req, res) => {
  try {
    const settings = await NewsletterSettings.findOneAndUpdate({}, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const SETTINGS_FIELDS = [
  'popupEnabled', 'popupDelaySeconds', 'popupTitle', 'popupBody', 'ctaButtonText',
  'integrationProvider', 'integrationApiKey', 'integrationListId',
];

// @desc Update the singleton newsletter settings doc
const updateSettings = async (req, res) => {
  try {
    const update = {};
    SETTINGS_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    const settings = await NewsletterSettings.findOneAndUpdate({}, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    logActivity({ req, action: 'newsletter.settings_updated', targetType: 'NewsletterSettings', targetId: settings._id });
    return res.status(200).json({ success: true, message: 'Settings updated', data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Public: just the fields the popup itself needs to render — never the integration
// provider/API key/list ID, which are internal ESP configuration, not reader-facing.
const getPublicPopupSettings = async (req, res) => {
  try {
    const settings = await NewsletterSettings.findOneAndUpdate({}, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
    const { popupEnabled, popupDelaySeconds, popupTitle, popupBody, ctaButtonText } = settings;
    return res.status(200).json({ success: true, data: { popupEnabled, popupDelaySeconds, popupTitle, popupBody, ctaButtonText } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  subscribe,
  getSubscribers,
  deleteSubscriber,
  exportSubscribers,
  importSubscribers,
  getSubscriberGrowth,
  getSettings,
  updateSettings,
  getPublicPopupSettings,
};
