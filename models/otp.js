const mongoose = require("mongoose");

// ✅ Stores OTPs temporarily — auto-deletes after 10 minutes
const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true },
  otp:       { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // auto-delete after 10 min
});

module.exports = mongoose.model("OTP", otpSchema);
