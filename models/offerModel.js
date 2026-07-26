const mongoose = require("mongoose");

const offerSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, default: "" }, // square logo — used in listings, avatars, related cards
    bannerImage: { type: String, default: "" }, // wide banner — used at the top of the offer detail page
    previewUrl: { type: String, default: "" },
    category: { type: String, required: true },
    country: { type: String, required: true },
    platform: {
      type: String,
      required: true,
      enum: ["App", "Web", "App + Web"],
    },
    model: {
      type: String,
      required: true,
      enum: ["CPA", "CPL", "CPS", "CPI", "CPR", "Rev Share"],
    },
    payout: { type: String, required: true },
    description: { type: String, required: true },
    ctaLabel: { type: String, default: "View Offer" },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    about: { type: String, default: "" },
    whyPromote: { type: String, default: "" },
    whyPromoteList: { type: [String], default: [] },
    whoShouldPromote: {
      idealPublisherProfile: { type: String, default: "" },
      audienceMatch: { type: String, default: "" },
    },
    trafficRules: {
      allowed: { type: [String], default: [] },
      notAllowed: { type: [String], default: [] },
    },
    complianceNote: { type: String, default: "" },
    trackingFlow: {
      steps: { type: [String], default: [] },
      window: { type: String, default: "" },
      attribution: { type: String, default: "" },
      method: { type: String, default: "" },
      deduplication: { type: String, default: "" },
    },
    promotionalTips: { type: [String], default: [] },
    paymentMethods: { type: String, default: "" },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
