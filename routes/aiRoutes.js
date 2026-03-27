const express = require("express");
const router = express.Router();
const axios = require("axios");
const Course = require("../models/Course");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ✅ Multiple free models — tries each one if the previous fails
const FREE_MODELS = [
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-4b-it:free",
];

// ✅ Tries each model in order until one works
async function callAI(prompt) {
  let lastError = null;

  for (const model of FREE_MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4000,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "LearnHub LMS",
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const content = res.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from model");

      console.log(`✅ Success with model: ${model}`);
      return content;
    } catch (err) {
      console.error(`❌ Model ${model} failed:`, err.response?.data?.error?.message || err.message);
      lastError = err;
      // Wait 1 second before trying next model
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

// ✅ Safely parse JSON from AI response
function parseJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]") + 1;
  if (start === -1 || end === 0) throw new Error("No JSON array found in AI response");
  return JSON.parse(clean.slice(start, end));
}

// ─── GENERATE COURSES ────────────────────────────────────────────────────────
router.post("/generate-courses", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { domain, grade, count = 6 } = req.body;
    if (!domain) return res.status(400).json({ message: "Domain is required." });

    const prompt = `You are a curriculum expert. Generate exactly ${count} online course ideas for a student ${grade ? `studying in ${grade}` : ""} with interest in "${domain}".

For each course provide these exact fields:
- title: course name
- description: exactly 2 sentences
- instructor: fictional full name
- category: MUST be one of: Programming, Web Development, Data Science, Design, Business, General, Science, Mathematics, Language, History
- duration: format like "3h 30m" or "1h 45m"
- whatYouLearn: array of exactly 6 short bullet point strings

Respond ONLY with a valid JSON array. No explanation, no markdown, no backticks, no text before or after:
[
  {
    "title": "...",
    "description": "...",
    "instructor": "...",
    "category": "...",
    "duration": "...",
    "whatYouLearn": ["...", "...", "...", "...", "...", "..."]
  }
]`;

    const raw = await callAI(prompt);
    const courses = parseJSON(raw);

    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(500).json({ message: "AI returned invalid course data." });
    }

    const defaultVideos = [
      { videoUrl: "https://www.youtube.com/embed/kqtD5dpn9C8", thumbnail: "https://img.youtube.com/vi/kqtD5dpn9C8/maxresdefault.jpg" },
      { videoUrl: "https://www.youtube.com/embed/W6NZfCO5SIk", thumbnail: "https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg" },
      { videoUrl: "https://www.youtube.com/embed/GwIo3gDZCVQ", thumbnail: "https://img.youtube.com/vi/GwIo3gDZCVQ/maxresdefault.jpg" },
      { videoUrl: "https://www.youtube.com/embed/w7ejDZ8SWv8", thumbnail: "https://img.youtube.com/vi/w7ejDZ8SWv8/maxresdefault.jpg" },
      { videoUrl: "https://www.youtube.com/embed/fBNz5xF-Kx4", thumbnail: "https://img.youtube.com/vi/fBNz5xF-Kx4/maxresdefault.jpg" },
      { videoUrl: "https://www.youtube.com/embed/ua-CiDNNj30", thumbnail: "https://img.youtube.com/vi/ua-CiDNNj30/maxresdefault.jpg" },
    ];

    const toInsert = courses.map((c, i) => ({
      title: c.title || `Course ${i + 1}`,
      description: c.description || "",
      instructor: c.instructor || "LearnHub Instructor",
      category: c.category || "General",
      duration: c.duration || "2h 00m",
      whatYouLearn: Array.isArray(c.whatYouLearn) ? c.whatYouLearn : [],
      videoUrl: defaultVideos[i % defaultVideos.length].videoUrl,
      thumbnail: defaultVideos[i % defaultVideos.length].thumbnail,
      quiz: [],
    }));

    const saved = await Course.insertMany(toInsert);
    res.json({ message: `✅ ${saved.length} AI-generated courses added!`, courses: saved });
  } catch (err) {
    console.error("AI course generation error:", err.message);
    res.status(500).json({
      message: "AI generation failed. All free models are currently unavailable. Please try again in a few minutes.",
      error: err.message,
    });
  }
});

// ─── GENERATE QUIZ ────────────────────────────────────────────────────────────
router.post("/generate-quiz/:courseId", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    const prompt = `You are an expert educator. Create a 15-question multiple choice quiz for the course titled "${course.title}".
Course description: ${course.description}
Topics covered: ${course.whatYouLearn?.join(", ") || course.title}

Rules:
- Each question must have exactly 4 options
- Vary difficulty: 5 easy, 5 medium, 5 hard
- correctIndex is 0-based (0=first option, 1=second, etc.)
- Include explanation for the correct answer

Respond ONLY with a valid JSON array, no explanation, no markdown, no backticks:
[
  {
    "question": "...",
    "options": ["option1", "option2", "option3", "option4"],
    "correctIndex": 0,
    "explanation": "This is correct because..."
  }
]`;

    const raw = await callAI(prompt);
    const quiz = parseJSON(raw);

    const validQuiz = quiz.slice(0, 15).map(q => ({
      question: q.question,
      options: q.options.slice(0, 4),
      correctIndex: parseInt(q.correctIndex) || 0,
      explanation: q.explanation || "This is the correct answer based on the course material.",
    }));

    course.quiz = validQuiz;
    await course.save();

    res.json({ message: `Quiz with ${validQuiz.length} questions generated!`, quiz: validQuiz });
  } catch (err) {
    console.error("Quiz generation error:", err.message);
    res.status(500).json({
      message: "Quiz generation failed. Please try again in a few minutes.",
      error: err.message,
    });
  }
});

module.exports = router;
