const express = require("express");
const bcrypt = require("bcryptjs");
const { loginUser, verifyLoginTwoFactor, registerUser } = require("../controllers/authController");
const {
    startTwoFactorSetup,
    confirmTwoFactorSetup,
    disableTwoFactor,
    getTwoFactorStatus,
} = require("../controllers/twoFactorController");
const authMiddleware = require("../middleware/authMiddleware"); // Import middleware
const User = require("../models/userModel");

const router = express.Router();

// Register Admin (Only once)
router.post("/register", registerUser);

// Login Route
router.post("/login", loginUser);
router.post("/login/verify-2fa", verifyLoginTwoFactor);

// 2FA setup/management for the currently logged-in account (protected — acts on req.user.id)
router.get("/2fa/status", authMiddleware, getTwoFactorStatus);
router.post("/2fa/setup", authMiddleware, startTwoFactorSetup);
router.post("/2fa/confirm", authMiddleware, confirmTwoFactorSetup);
router.post("/2fa/disable", authMiddleware, disableTwoFactor);

// Logout Route
router.post("/logout", (req, res) => {
    res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.json({ message: "Logged out successfully" });
});

// ✅ Protected Route to Get Logged-in User
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password").populate("role", "name permissions"); // Exclude password
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // userType stays "admin" for every active account — every page that gates on
        // withProtectedRoute(Component, ["admin"]) keeps working unchanged. `role`/`permissions`
        // are the new, more granular layer: null permissions means "no role assigned yet",
        // which both this response and requirePermission.js treat as full access (matches the
        // single bootstrap admin before Roles & Permissions is set up for them).
        res.json({
          _id: user._id,
          email: user.email,
          name: user.name || "",
          userType: "admin",
          role: user.role?.name || null,
          permissions: user.role?.permissions || null,
      });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Change Password Route (protected)
router.post("/change-password", authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Both fields are required" });
    }
    try {
        const user = await User.findById(req.user.id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }
        user.password = newPassword; // pre-save hook hashes it
        await user.save();
        res.json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
