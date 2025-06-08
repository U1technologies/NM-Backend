const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const contactRoutes = require('./routes/contactRoutes');
const authRoutes = require('./routes/authRoute');

require('dotenv').config();

dotenv.config();
connectDB();

const app = express();

// Use cookie-parser middleware
app.use(cookieParser());

app.use(cors());
app.use(bodyParser.json());
app.use(express.json()); // ✅ Required for parsing JSON request bodies
app.use(express.urlencoded({ extended: true })); // ✅ Parses form data

app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
