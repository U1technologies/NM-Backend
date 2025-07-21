// const express = require('express');
// const { createJob, updateJob, deleteJob, getJobs } = require('../controllers/jobController');

// const router = express.Router();

// router.post('/', createJob);
// router.put('/:id', updateJob);
// router.delete('/:id', deleteJob);
// router.get('/', getJobs);

// module.exports = router;


const express = require('express');
const { createJob, updateJob, deleteJob, getJobs, applyJob } = require('../controllers/jobController');
const multer = require('multer');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

router.post('/', createJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);
router.get('/', getJobs);
router.post('/:jobId/apply', upload.single('resume'), applyJob);

module.exports = router;