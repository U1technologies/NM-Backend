const mongoose = require('mongoose');

// Singleton document — there's only ever one row here, fetched/updated via findOneAndUpdate
// with upsert:true in the controller rather than looked up by id.
const newsletterSettingsSchema = mongoose.Schema(
  {
    popupEnabled: { type: Boolean, default: false },
    popupDelaySeconds: { type: Number, default: 5 },
    popupTitle: { type: String, default: 'Subscribe to our newsletter' },
    popupBody: { type: String, default: 'Get the latest posts delivered straight to your inbox.' },
    ctaButtonText: { type: String, default: 'Subscribe' },
    // Actually pushing subscribers to an ESP requires a real API key for that provider — this
    // just stores the configuration; wiring the live API call is a follow-up once real
    // credentials for the chosen provider are available.
    integrationProvider: { type: String, enum: ['none', 'mailchimp', 'convertkit'], default: 'none' },
    integrationApiKey: { type: String, default: '' },
    integrationListId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NewsletterSettings', newsletterSettingsSchema);
