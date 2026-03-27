const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// GET ALL COURSES (with search & filter)
router.get("/all", async (req, res) => {
  try {
    const { search, category } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { instructor: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error("Fetch courses error:", error);
    res.status(500).json({ message: "Error fetching courses." });
  }
});

// GET SINGLE COURSE
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found." });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course." });
  }
});

// ADD COURSE (admin only)
router.post("/add", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, instructor, videoUrl, thumbnail, category, duration } = req.body;

    if (!title || !description || !instructor || !videoUrl)
      return res.status(400).json({ message: "Title, description, instructor, and videoUrl are required." });

    const course = new Course({ title, description, instructor, videoUrl, thumbnail, category, duration });
    await course.save();

    res.status(201).json({ message: "Course added successfully.", course });
  } catch (error) {
    console.error("Add course error:", error);
    res.status(500).json({ message: "Error adding course." });
  }
});

// UPDATE COURSE (admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Course not found." });
    res.json({ message: "Course updated.", course: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating course." });
  }
});

// DELETE COURSE (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Course not found." });
    res.json({ message: "Course deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting course." });
  }
});

module.exports = router;
