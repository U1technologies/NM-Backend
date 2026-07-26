const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const User = require('../models/userModel');
const logActivity = require('../utils/activityLogger');

const issueSessionToken = (user) => jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log("📥 Login Attempt:", { email });

  try {
      // Find user in MongoDB
      const user = await User.findOne({ email });
      console.log("🔍 User Found:", !!user); // Check if the user exists

      if (!user) {
          console.log("❌ User not found");
          return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log("✅ Password Match Status:", isPasswordValid);

      if (!isPasswordValid) {
          console.log("❌ Incorrect Password");
          return res.status(401).json({ error: 'Invalid email or password' });
      }

      // 2FA is opt-in (twoFactorEnabled defaults false) — every account that hasn't turned it
      // on falls straight through to the exact same response shape as before this feature
      // existed, so existing sessions/clients are completely unaffected.
      if (user.twoFactorEnabled) {
          const pendingToken = jwt.sign({ id: user._id, purpose: '2fa-pending' }, process.env.JWT_SECRET, { expiresIn: '5m' });
          return res.json({ requiresTwoFactor: true, pendingToken });
      }

      const token = issueSessionToken(user);
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

      console.log("🎉 Login Successful! Token Generated.");
      logActivity({ req, action: 'user.login', targetType: 'User', targetId: user._id, targetLabel: user.email, actorUser: user._id, actorEmail: user.email });
      res.json({ message: 'Logged in successfully', token });

  } catch (error) {
      console.error("🔥 Error in loginUser:", error);
      res.status(500).json({ error: 'Internal server error' });
  }
};

// @desc Complete login after a 2FA-enabled account passed the password check — exchanges the
// short-lived pendingToken + a valid authenticator code for a real session token.
const verifyLoginTwoFactor = async (req, res) => {
  const { pendingToken, code } = req.body;
  try {
      let decoded;
      try {
          decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
      } catch {
          return res.status(401).json({ error: 'Your session expired — please log in again' });
      }
      if (decoded.purpose !== '2fa-pending') {
          return res.status(401).json({ error: 'Invalid request' });
      }

      const user = await User.findById(decoded.id);
      if (!user || !user.twoFactorEnabled) {
          return res.status(401).json({ error: 'Invalid request' });
      }

      const isValid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: String(code || ''), window: 1 });
      if (!isValid) {
          return res.status(401).json({ error: 'Invalid authentication code' });
      }

      const token = issueSessionToken(user);
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      logActivity({ req, action: 'user.login', targetType: 'User', targetId: user._id, targetLabel: user.email, actorUser: user._id, actorEmail: user.email });
      res.json({ message: 'Logged in successfully', token });
  } catch (error) {
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

module.exports = { loginUser, verifyLoginTwoFactor, registerUser };
