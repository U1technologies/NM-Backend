// const express = require('express');
// const dotenv = require('dotenv');
// const connectDB = require('./config/db');
// const contactRoutes = require('./routes/contactRoutes');

// dotenv.config();
// const app = express();
// connectDB();

// app.use(express.json()); // Middleware to parse JSON

// // Routes
// app.use('/api/contacts', contactRoutes);

// // Error Handler Middleware
// app.use((err, req, res, next) => {
//   res.status(err.status || 500).json({ message: err.message || 'Server Error' });
// });

// module.exports = app;

// app.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const contactRoutes = require('./routes/contactRoutes');
const authRoutes = require('./routes/authRoute');
const jobRoutes = require('./routes/jobRoutes');
const serviceInquiryRoutes = require('./routes/serviceInquiryRoutes');
const offerRoutes = require('./routes/offerRoutes');
const blogPostRoutes = require('./routes/blogPostRoutes');
const blogCategoryRoutes = require('./routes/blogCategoryRoutes');
const blogTagRoutes = require('./routes/blogTagRoutes');
const blogAuthorRoutes = require('./routes/blogAuthorRoutes');
const blogCommentRoutes = require('./routes/blogCommentRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const adminSearchRoutes = require('./routes/adminSearchRoutes');
const blogMediaRoutes = require('./routes/blogMediaRoutes');
const seoManagerRoutes = require('./routes/seoManagerRoutes');
const internalLinkRoutes = require('./routes/internalLinkRoutes');
const redirectRoutes = require('./routes/redirectRoutes');
const blogRevisionRoutes = require('./routes/blogRevisionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cookieParser());
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/inquiries', serviceInquiryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/blog-posts', blogPostRoutes);
app.use('/api/blog-categories', blogCategoryRoutes);
app.use('/api/blog-tags', blogTagRoutes);
app.use('/api/blog-authors', blogAuthorRoutes);
app.use('/api/blog-comments', blogCommentRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/admin-search', adminSearchRoutes);
app.use('/api/blog-media', blogMediaRoutes);
app.use('/api/seo-manager', seoManagerRoutes);
app.use('/api/internal-links', internalLinkRoutes);
app.use('/api/redirects', redirectRoutes);
app.use('/api/blog-revisions', blogRevisionRoutes);
app.use('/api/notifications', notificationRoutes);

// Optional: Health check route
app.get('/', (req, res) => res.json({ message: 'Backend running fine!' }));

// Export the configured app (not listening yet)
module.exports = app;
