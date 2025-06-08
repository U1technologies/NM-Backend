const mongoose = require("mongoose");

const contactSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }, // Added phone field
    service: { type: String, required: true }, // Updated field to match frontend
    message: { type: String }, // Optional field
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);
