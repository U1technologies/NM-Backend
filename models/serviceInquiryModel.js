const mongoose = require('mongoose');

const serviceInquirySchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    contactNo: { type: String, required: true },
    message: { type: String },
    budget: { type: String },
    selectedServices: { type: [String], default: [] },
    remark: {
      type: String,
      enum: ["New", "Contacted", "In Discussion", "Proposal Sent", "Converted", "Follow Up", "Not Interested", "Spam"],
      default: "New",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ServiceInquiry', serviceInquirySchema);
