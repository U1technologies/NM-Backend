const mongoose = require("mongoose");

const jobSchema = mongoose.Schema(
  {
    jobTitle: { type: String, required: true },
    numberOfOpenings: { type: Number, required: true, min: 1 },
    category: { 
      type: String, 
      required: true, 
      enum: ["IT", "Design", "Sales & Marketing", "Accounting & Finance", "Management"] 
    },
    experienceMin: { type: Number, required: true, min: 0 },
    experienceMax: { type: Number, required: true, min: 0 },
    location: { 
      type: String, 
      required: true, 
      enum: ["Noida, India", "Washington, United States", "Remote"] 
    },
    workplaceType: {
    type: String,
    required: true,
    enum: ["On-site", "Remote", "Hybrid"]
   },
    jobType: { 
      type: String, 
      required: true, 
      enum: ["Full-Time", "Part-Time", "Internship"] 
    },
    salaryMin: { type: String, required: true },
    salaryMax: { type: String, required: true },
    jobLevel: { 
      type: String, 
      required: true, 
      enum: ["Entry Level", "Mid Level", "Senior Level", "Executive"] 
    },
    education: { 
      type: String, 
      enum: ["UG-Pursuing", "Graduate", "Post Graduate", "Doctorate", ""], 
      default: "" 
    },
    supplementalPay: { type: String },
    benefits: { type: String },
    jobDescription: { type: String, required: true },
    qualifications: { type: String, required: true },
    deadline: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);