const rateLimit = require('express-rate-limit');

// Shared response shape so a throttled request looks like any other API error to the frontend.
const handler = (req, res) => res.status(429).json({ success: false, message: 'Too many requests — please try again shortly.' });

// Comment/newsletter submissions: a real person fills out a form, so a generous-but-real cap.
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, handler });

// View/like/404-log pings fire automatically on page load — much higher volume is normal.
const pingLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, handler });

module.exports = { writeLimiter, pingLimiter };
