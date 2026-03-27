const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  completed: { type: Boolean, default: false },
  progress: { type: Number, default: 0, min: 0, max: 100 }, // percentage
  completedAt: { type: Date },
}, { timestamps: true });

// Prevent duplicate enrollments
enrollmentSchema.index({ userEmail: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
