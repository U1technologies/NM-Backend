const Job = require('../models/jobModel');
const Application = require('../models/applicationModel');

// @desc Create a new job posting
const createJob = async (req, res) => {
  try {
    console.log("Incoming Request Body:", req.body); // Step 1: Log entire body

    const { 
      jobTitle, numberOfOpenings, category, experienceMin, experienceMax, 
      location, workplaceType, jobType, salaryMin, salaryMax, jobLevel, education, 
      supplementalPay, benefits, jobDescription, qualifications, deadline 
    } = req.body;

    // Step 2: Debug each required field
    const requiredFields = {
      jobTitle, 
      numberOfOpenings, 
      category, 
      experienceMin, 
      experienceMax, 
      location, 
      workplaceType, 
      jobType, 
      salaryMin, 
      salaryMax, 
      jobLevel, 
      jobDescription, 
      qualifications
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null || value === "") {
        console.log(`Missing or empty required field: ${key}`);
        return res.status(400).json({
          success: false,
          message: `Field "${key}" is required and missing!`
        });
      }
    }

    // Step 3: Validate experience range
    if (experienceMin > experienceMax) {
      return res.status(400).json({ 
        success: false, 
        message: "Minimum experience cannot exceed maximum experience!" 
      });
    }

    const job = await Job.create({ 
      jobTitle, numberOfOpenings, category, experienceMin, experienceMax, 
      location, workplaceType, jobType, salaryMin, salaryMax, jobLevel, education, 
      supplementalPay, benefits, jobDescription, qualifications, deadline 
    });

    return res.status(201).json({ 
      success: true, 
      message: "Job created successfully", 
      data: job 
    });

  } catch (error) {
    console.error("Job creation error:", error); // Step 4: Log any thrown error
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update an existing job posting
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      jobTitle, numberOfOpenings, category, experienceMin, experienceMax, 
      location, workplaceType, jobType, salaryMin, salaryMax, jobLevel, education, 
      supplementalPay, benefits, jobDescription, qualifications, deadline 
    } = req.body;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Update fields if provided
    if (jobTitle) job.jobTitle = jobTitle;
    if (numberOfOpenings) job.numberOfOpenings = numberOfOpenings;
    if (category) job.category = category;
    if (experienceMin !== undefined) job.experienceMin = experienceMin;
    if (experienceMax !== undefined) job.experienceMax = experienceMax;
    if (location) job.location = location;
    if (workplaceType) job.workplaceType = workplaceType;
    if (jobType) job.jobType = jobType;
    if (salaryMin) job.salaryMin = salaryMin;
    if (salaryMax) job.salaryMax = salaryMax;
    if (jobLevel) job.jobLevel = jobLevel;
    if (education !== undefined) job.education = education;
    if (supplementalPay !== undefined) job.supplementalPay = supplementalPay;
    if (benefits !== undefined) job.benefits = benefits;
    if (jobDescription) job.jobDescription = jobDescription;
    if (qualifications) job.qualifications = qualifications;
    if (deadline !== undefined) job.deadline = deadline;

    // Validate experience range if both provided
    if (experienceMin !== undefined && experienceMax !== undefined && experienceMin > experienceMax) {
      return res.status(400).json({ success: false, message: "Minimum experience cannot exceed maximum experience!" });
    }

    await job.save();
    res.status(200).json({ success: true, message: "Job updated successfully", data: job });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a job posting
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    await job.deleteOne();
    res.status(200).json({ success: true, message: "Job deleted successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all job postings
const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }); // Sort by newest first
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const applyJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { 
      firstName, lastName, email, phone, coverLetter, linkedinUrl, 
      portfolioUrl, experience, expectedSalary, currentCTC, noticePeriod 
    } = req.body;

    // Validate required fields
    if (!jobId || !firstName || !lastName || !email || !phone || !req.file) {
      return res.status(400).json({ success: false, message: "All required fields must be filled!" });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Invalid file type. Only PDF, DOC, or DOCX allowed!" });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "File size exceeds 5MB limit!" });
    }

    // Store file path (assuming uploaded to uploads folder)
    const resumePath = path.join('uploads', req.file.filename);

    const application = await Application.create({
      jobId,
      firstName,
      lastName,
      email,
      phone,
      coverLetter,
      linkedinUrl,
      portfolioUrl,
      experience,
      expectedSalary,
      currentCTC,
      noticePeriod,
      resume: resumePath
    });

    res.status(201).json({ success: true, message: "Application submitted successfully", data: application });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createJob, updateJob, deleteJob, getJobs, applyJob };