const express = require('express');
const { createJob, updateJob, deleteJob, getJobs, applyJob, getApplications } = require('../controllers/jobController');
const upload = require('../utils/multer');

const router = express.Router();

router.post('/', createJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);
router.get('/', getJobs);
router.post('/apply/:jobId', upload.single('resume'), applyJob);
router.get('/applications', getApplications);

module.exports = router;


