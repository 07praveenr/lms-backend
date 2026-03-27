const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Review = require("../models/Review");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [totalUsers, totalCourses, totalEnrollments, totalReviews] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      Review.countDocuments(),
    ]);

    // Most enrolled courses
    const popularCourses = await Enrollment.aggregate([
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
      { $unwind: "$course" },
      { $project: { title: "$course.title", category: "$course.category", count: 1 } },
    ]);

    // Enrollments by category
    const enrollmentsByCategory = await Enrollment.aggregate([
      { $lookup: { from: "courses", localField: "courseId", foreignField: "_id", as: "course" } },
      { $unwind: "$course" },
      { $group: { _id: "$course.category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recent signups (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSignups = await User.countDocuments({ createdAt: { $gte: weekAgo } });

    // Completion rate
    const completedCount = await Enrollment.countDocuments({ completed: true });
    const completionRate = totalEnrollments
      ? Math.round((completedCount / totalEnrollments) * 100)
      : 0;

    res.json({
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalReviews,
      recentSignups,
      completionRate,
      popularCourses,
      enrollmentsByCategory,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Error fetching analytics." });
  }
});

module.exports = router;
