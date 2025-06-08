const express = require("express");
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

module.exports = router;
