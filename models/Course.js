const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  instructor: { type: String, required: true },
  videoUrl: { type: String, required: true },
  thumbnail: { type: String },
  category: { type: String, default: "General" },
  duration: { type: String, default: "" },
  whatYouLearn: [{ type: String }],
  quiz: [
    {
      question: { type: String, required: true },
      options: [{ type: String }],
      correctIndex: { type: Number, required: true },
      explanation: { type: String, default: "" }, // AI explanation
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
