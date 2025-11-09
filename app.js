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

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cookieParser());
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);

// Optional: Health check route
app.get('/', (req, res) => res.json({ message: 'Backend running fine!' }));

// Export the configured app (not listening yet)
module.exports = app;
