const mongoose = require("mongoose");

const applicationSchema = mongoose.Schema(
  {
    jobId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Job", 
      required: true 
    },
    firstName: { 
      type: String, 
      required: true 
    },
    lastName: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
    },
    phone: { 
      type: String, 
      required: true,
      match: [/^\+?[\d\s-]{10,}$/, "Please enter a valid phone number"]
    },
    coverLetter: { 
      type: String 
    },
    linkedinUrl: { 
      type: String,
      match: [/^https?:\/\/(www\.)?linkedin\.com\/.*$/, "Please enter a valid LinkedIn URL"]
    },
    portfolioUrl: { 
      type: String,
      match: [/^https?:\/\/.*$/, "Please enter a valid URL"]
    },
    experience: { 
      type: String 
    },
    expectedSalary: { 
      type: String 
    },
    currentCTC: { 
      type: String 
    },
    noticePeriod: { 
      type: String 
    },
    resume: { 
      type: String, 
      required: true // Store file path or URL
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);