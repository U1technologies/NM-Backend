const ServiceInquiry = require('../models/serviceInquiryModel');

// @desc Store service inquiry form submission
const storeServiceInquiry = async (req, res) => {
  try {
    const { name, email, contactNo, message, budget, selectedServices } = req.body;

    if (!name || !email || !contactNo) {
      return res.status(400).json({ success: false, message: 'Name, email, and contact number are required!' });
    }

    const inquiry = await ServiceInquiry.create({ name, email, contactNo, message, budget, selectedServices });
    res.status(201).json({ success: true, message: 'Inquiry submitted successfully', data: inquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all service inquiry submissions
const getServiceInquiries = async (req, res) => {
  try {
    const inquiries = await ServiceInquiry.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update remark for an inquiry
const updateInquiryRemark = async (req, res) => {
  try {
    const { remark } = req.body;
    const inquiry = await ServiceInquiry.findByIdAndUpdate(
      req.params.id,
      { remark },
      { new: true }
    );
    if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found" });
    res.status(200).json({ success: true, data: inquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { storeServiceInquiry, getServiceInquiries, updateInquiryRemark };
