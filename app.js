const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const contactRoutes = require('./routes/contactRoutes');

dotenv.config();
const app = express();
connectDB();

app.use(express.json()); // Middleware to parse JSON

// Routes
app.use('/api/contacts', contactRoutes);

// Error Handler Middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

module.exports = app;
