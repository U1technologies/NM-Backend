const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log("📥 Login Attempt:", { email, password });

  try {
      // Find user in MongoDB
      const user = await User.findOne({ email });
      console.log("🔍 User Found:", user); // Check if the user exists

      if (!user) {
          console.log("❌ User not found");
          return res.status(401).json({ error: 'Invalid email or password' });
      }

      console.log("🔒 Stored Hashed Password:", user.password);

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log("✅ Password Match Status:", isPasswordValid);

      if (!isPasswordValid) {
          console.log("❌ Incorrect Password");
          return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT Token
      const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
          expiresIn: '1h',
      });

      // Set the token in an HTTP-only cookie
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

      console.log("🎉 Login Successful! Token Generated.");
      res.json({ message: 'Logged in successfully', token });

  } catch (error) {
      console.error("🔥 Error in loginUser:", error);
      res.status(500).json({ error: 'Internal server error' });
  }
};


// Register Admin (One-time)
const registerUser = async (req, res) => {
  const { email, password } = req.body;

  try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ error: 'User already exists' });
      }

      // ✅ Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();

      res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
      console.error('Error in registerUser:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { loginUser, registerUser };
