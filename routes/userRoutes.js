const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const OTP     = require("../models/otp");
const Enrollment = require("../models/Enrollment"); // adjust path if different
const { sendOTPEmail } = require("../utils/emailService");

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── auth middleware (inline) ─────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token." });
  }
}

// ════════════════════════════════════════════════════════════════
// POST /api/user/signup
// ════════════════════════════════════════════════════════════════
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const existing = await User.findOne({ email });
    if (existing && existing.isVerified)
      return res.status(400).json({ message: "Email already registered. Please login." });

    const hashedPassword = await bcrypt.hash(password, 10);
    if (existing && !existing.isVerified) {
      existing.name = name; existing.password = hashedPassword;
      await existing.save();
    } else {
      await User.create({ name, email, password: hashedPassword, isVerified: false });
    }

    await OTP.deleteMany({ email });
    const otp = generateOTP();
    await OTP.create({ email, otp });
    await sendOTPEmail(email, otp, name);

    res.status(200).json({ message: "OTP sent to your email!", email });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Signup failed. Please try again." });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/user/verify-otp
// ════════════════════════════════════════════════════════════════
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required." });

    const record = await OTP.findOne({ email, otp });
    if (!record)
      return res.status(400).json({ message: "Invalid or expired OTP." });

    const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
    if (!user) return res.status(400).json({ message: "User not found." });

    await OTP.deleteMany({ email });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({
      message: "Email verified! Welcome to LearnHub 🎉",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("OTP verify error:", err.message);
    res.status(500).json({ message: "Verification failed." });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/user/resend-otp
// ════════════════════════════════════════════════════════════════
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "No account found." });
    if (user.isVerified) return res.status(400).json({ message: "Already verified. Please login." });

    await OTP.deleteMany({ email });
    const otp = generateOTP();
    await OTP.create({ email, otp });
    await sendOTPEmail(email, otp, user.name);

    res.status(200).json({ message: "New OTP sent!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to resend OTP." });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/user/login
// ════════════════════════════════════════════════════════════════
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "No account found with this email." });
    if (!user.isVerified)
      return res.status(403).json({ message: "Email not verified. Check your inbox.", needsVerification: true, email });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password." });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({
      message: "Login successful!",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed." });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/user/profile
// ════════════════════════════════════════════════════════════════
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch {
    res.status(500).json({ message: "Error fetching profile." });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/user/profile  — update name / password
// ════════════════════════════════════════════════════════════════
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (name) user.name = name;

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ message: "Current password required to set new password." });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(400).json({ message: "Current password is incorrect." });
      if (newPassword.length < 6)
        return res.status(400).json({ message: "New password must be at least 6 characters." });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({ message: "Profile updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile." });
  }
});

// ════════════════════════════════════════════════════════════════
// DELETE /api/user/delete-account
// Permanently deletes user + all their enrollments
// Requires password confirmation
// ════════════════════════════════════════════════════════════════
router.delete("/delete-account", auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ message: "Password is required to delete your account." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Verify password before deletion
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password. Account not deleted." });

    // ✅ Delete all enrollments for this user
    try {
      await Enrollment.deleteMany({ user: req.user.id });
      console.log(`Deleted enrollments for user: ${user.email}`);
    } catch (enrollErr) {
      console.log("Note: Could not delete enrollments:", enrollErr.message);
      // Continue anyway — user deletion is more important
    }

    // ✅ Delete any pending OTPs
    await OTP.deleteMany({ email: user.email });

    // ✅ Delete the user account permanently
    await User.findByIdAndDelete(req.user.id);

    console.log(`✅ Account permanently deleted: ${user.email}`);

    res.status(200).json({
      message: "Your account has been permanently deleted. We're sorry to see you go.",
    });
  } catch (err) {
    console.error("Delete account error:", err.message);
    res.status(500).json({ message: "Failed to delete account. Please try again." });
  }
});

module.exports = router;
