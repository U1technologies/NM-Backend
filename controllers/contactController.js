const Contact = require('../models/contactModel');

// @desc Store contact form submission
const storeContact = async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;
    
    if (!name || !email || !phone || !service) {
      return res.status(400).json({ message: "All required fields must be filled!" });
    }

    const contact = await Contact.create({ name, email, phone, service, message });
    res.status(201).json({ success: true, message: "Form submitted successfully", data: contact });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all contact form submissions
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update remark for a contact
const updateRemark = async (req, res) => {
  try {
    const { remark } = req.body;
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { remark },
      { new: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });
    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { storeContact, getContacts, updateRemark };
