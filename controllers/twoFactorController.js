const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/userModel');

// @desc Start 2FA setup for the current user — generates a new secret + QR code, but does NOT
// turn 2FA on yet. It only activates once confirmTwoFactorSetup verifies a real code, so a
// half-finished setup can never lock someone out of their own account.
const startTwoFactorSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const secret = speakeasy.generateSecret({ name: `NextagMedia Admin (${user.email})`, length: 20 });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false;
    await user.save();

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.status(200).json({ success: true, data: { secret: secret.base32, qrCodeDataUrl } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Confirm setup by verifying a code from the authenticator app — this is the one place
// twoFactorEnabled actually flips to true.
const confirmTwoFactorSetup = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'No pending 2FA setup found — start setup first' });
    }

    // window: 1 tolerates the previous/next 30-second step, absorbing minor clock drift
    // between the server and the admin's phone.
    const isValid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: String(token || ''), window: 1 });
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid code — check your authenticator app and try again' });
    }

    user.twoFactorEnabled = true;
    await user.save();
    return res.status(200).json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Disable 2FA for the current user
const disableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.twoFactorEnabled = false;
    user.twoFactorSecret = '';
    await user.save();
    return res.status(200).json({ success: true, message: '2FA disabled' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get current 2FA status for the logged-in user
const getTwoFactorStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('twoFactorEnabled');
    return res.status(200).json({ success: true, data: { twoFactorEnabled: user?.twoFactorEnabled || false } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { startTwoFactorSetup, confirmTwoFactorSetup, disableTwoFactor, getTwoFactorStatus };
