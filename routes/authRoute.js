const express = require("express");
const bcrypt = require("bcryptjs");
const { loginUser, registerUser } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware"); // Import middleware
const User = require("../models/userModel");

const router = express.Router();

// Register Admin (Only once)
router.post("/register", registerUser);

// Login Route
router.post("/login", loginUser);

// Logout Route
router.post("/logout", (req, res) => {
    res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.json({ message: "Logged out successfully" });
});

// ✅ Protected Route to Get Logged-in User
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password"); // Exclude password
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({
          _id: user._id,
          email: user.email,
          userType: "admin", // 🔹 Add this field manually or fetch from DB
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
