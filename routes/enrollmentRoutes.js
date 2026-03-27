const express = require("express");
const router = express.Router();
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const { authMiddleware } = require("../middleware/auth");

// ENROLL IN COURSE
router.post("/enroll", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.body;
    const userEmail = req.user.email;

    if (!courseId)
      return res.status(400).json({ message: "courseId is required." });

    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ message: "Course not found." });

    const existing = await Enrollment.findOne({ userEmail, courseId });
    if (existing)
      return res.status(409).json({ message: "Already enrolled in this course." });

    const enrollment = new Enrollment({ userEmail, courseId });
    await enrollment.save();

    res.status(201).json({ message: "Enrollment successful." });
  } catch (error) {
    console.error("Enroll error:", error);
    res.status(500).json({ message: "Error enrolling in course." });
  }
});

// GET MY ENROLLED COURSES
router.get("/mycourses", authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const enrollments = await Enrollment.find({ userEmail }).populate("courseId");

    const result = enrollments.map((e) => ({
      enrollment: {
        id: e._id,
        completed: e.completed,
        progress: e.progress,
        completedAt: e.completedAt,
        enrolledAt: e.createdAt,
      },
      course: e.courseId,
    }));

    res.json(result);
  } catch (error) {
    console.error("My courses error:", error);
    res.status(500).json({ message: "Error fetching enrolled courses." });
  }
});

// UPDATE PROGRESS
router.patch("/progress/:courseId", authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { courseId } = req.params;
    const { progress } = req.body;

    if (progress === undefined || progress < 0 || progress > 100)
      return res.status(400).json({ message: "Progress must be between 0 and 100." });

    const update = { progress };
    if (progress === 100) {
      update.completed = true;
      update.completedAt = new Date();
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { userEmail, courseId },
      update,
      { new: true }
    );

    if (!enrollment)
      return res.status(404).json({ message: "Enrollment not found." });

    res.json({ message: "Progress updated.", enrollment });
  } catch (error) {
    console.error("Progress update error:", error);
    res.status(500).json({ message: "Error updating progress." });
  }
});

// CHECK IF ENROLLED
router.get("/check/:courseId", authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const enrollment = await Enrollment.findOne({ userEmail, courseId: req.params.courseId });
    res.json({ enrolled: !!enrollment, enrollment });
  } catch (error) {
    res.status(500).json({ message: "Error checking enrollment." });
  }
});

module.exports = router;
