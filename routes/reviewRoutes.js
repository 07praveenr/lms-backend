const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const { authMiddleware } = require("../middleware/auth");

// GET reviews for a course
router.get("/:courseId", async (req, res) => {
  try {
    const reviews = await Review.find({ courseId: req.params.courseId }).sort({ createdAt: -1 });
    const avg = reviews.length
      ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
      : 0;
    res.json({ reviews, avgRating: parseFloat(avg), totalReviews: reviews.length });
  } catch (err) {
    res.status(500).json({ message: "Error fetching reviews." });
  }
});

// ADD review
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { courseId, rating, comment } = req.body;
    if (!courseId || !rating || !comment)
      return res.status(400).json({ message: "All fields are required." });

    const existing = await Review.findOne({ courseId, userId: req.user.id });
    if (existing)
      return res.status(409).json({ message: "You have already reviewed this course." });

    const review = await Review.create({
      courseId, rating, comment,
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.body.userName || req.user.email,
    });

    res.status(201).json({ message: "Review added!", review });
  } catch (err) {
    res.status(500).json({ message: "Error adding review." });
  }
});

// DELETE review (own review only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, userId: req.user.id });
    if (!review) return res.status(404).json({ message: "Review not found." });
    await review.deleteOne();
    res.json({ message: "Review deleted." });
  } catch (err) {
    res.status(500).json({ message: "Error deleting review." });
  }
});

module.exports = router;
