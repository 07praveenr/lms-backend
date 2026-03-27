require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const Course = require("./models/Course");

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lms")
  .then(async () => {
    console.log("MongoDB Connected");
    await seedCourses();
  })
  .catch(err => console.log("MongoDB connection error:", err));

async function seedCourses() {
  const count = await Course.countDocuments();
  if (count === 0) {
    await Course.insertMany([
      {
        title: "Python Basics",
        description: "Learn Python programming from scratch with hands-on examples.",
        instructor: "John Smith",
        videoUrl: "https://www.youtube.com/embed/kqtD5dpn9C8",
        thumbnail: "https://img.youtube.com/vi/kqtD5dpn9C8/maxresdefault.jpg",
        category: "Programming", duration: "4h 30m",
        whatYouLearn: ["Python syntax and data types", "Functions and modules", "File handling", "OOP concepts", "Error handling", "Libraries like NumPy & Pandas"],
        quiz: [
          { question: "What is the output of print(2 ** 3)?", options: ["6", "8", "9", "5"], correctIndex: 1 },
          { question: "Which keyword is used to define a function in Python?", options: ["function", "def", "fun", "define"], correctIndex: 1 },
          { question: "What data type is [1, 2, 3]?", options: ["tuple", "set", "list", "dict"], correctIndex: 2 },
          { question: "How do you add a comment in Python?", options: ["//", "/**/", "#", "--"], correctIndex: 2 },
          { question: "What does len('hello') return?", options: ["4", "5", "6", "error"], correctIndex: 1 },
        ],
      },
      {
        title: "JavaScript Fundamentals",
        description: "Understand JavaScript for modern web development.",
        instructor: "David Lee",
        videoUrl: "https://www.youtube.com/embed/W6NZfCO5SIk",
        thumbnail: "https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg",
        category: "Web Development", duration: "6h 15m",
        whatYouLearn: ["Variables and data types", "DOM manipulation", "Functions and scope", "ES6+ features", "Async/Await & Promises", "Event handling"],
        quiz: [
          { question: "Which keyword declares a block-scoped variable?", options: ["var", "let", "both", "none"], correctIndex: 1 },
          { question: "What does === check?", options: ["Value only", "Type only", "Value and type", "Neither"], correctIndex: 2 },
          { question: "What is the output of typeof null?", options: ["null", "undefined", "object", "string"], correctIndex: 2 },
          { question: "How do you write an arrow function?", options: ["function() =>", "() =>", "=> ()", "fn =>"], correctIndex: 1 },
          { question: "Which method adds an element to the end of an array?", options: ["push()", "pop()", "shift()", "unshift()"], correctIndex: 0 },
        ],
      },
      {
        title: "Machine Learning Intro",
        description: "Introduction to machine learning concepts and algorithms.",
        instructor: "Andrew Ng",
        videoUrl: "https://www.youtube.com/embed/GwIo3gDZCVQ",
        thumbnail: "https://img.youtube.com/vi/GwIo3gDZCVQ/maxresdefault.jpg",
        category: "Data Science", duration: "8h 00m",
        whatYouLearn: ["Supervised vs unsupervised learning", "Linear & logistic regression", "Decision trees", "Neural network basics", "Model evaluation", "Scikit-learn library"],
        quiz: [
          { question: "What type of learning uses labeled data?", options: ["Unsupervised", "Supervised", "Reinforcement", "Deep"], correctIndex: 1 },
          { question: "Which algorithm is used for classification?", options: ["Linear Regression", "Logistic Regression", "K-Means", "PCA"], correctIndex: 1 },
          { question: "What is overfitting?", options: ["Model too simple", "Model too complex", "Missing data", "Wrong labels"], correctIndex: 1 },
          { question: "What does MSE stand for?", options: ["Mean Squared Error", "Max Standard Error", "Model Score Estimator", "None"], correctIndex: 0 },
          { question: "Which library is commonly used for ML in Python?", options: ["React", "Scikit-learn", "Express", "jQuery"], correctIndex: 1 },
        ],
      },
      {
        title: "React JS Full Course",
        description: "Build modern web apps with React from scratch.",
        instructor: "Traversy Media",
        videoUrl: "https://www.youtube.com/embed/w7ejDZ8SWv8",
        thumbnail: "https://img.youtube.com/vi/w7ejDZ8SWv8/maxresdefault.jpg",
        category: "Web Development", duration: "5h 00m",
        whatYouLearn: ["React components", "Props and state", "Hooks (useState, useEffect)", "React Router", "Context API", "Building real projects"],
        quiz: [
          { question: "What hook manages state in React?", options: ["useEffect", "useState", "useRef", "useContext"], correctIndex: 1 },
          { question: "What is JSX?", options: ["A database", "JavaScript XML", "A CSS framework", "A backend tool"], correctIndex: 1 },
          { question: "What does useEffect do?", options: ["Manages state", "Handles side effects", "Creates components", "Styles elements"], correctIndex: 1 },
          { question: "How do you pass data to a child component?", options: ["State", "Props", "Context", "Redux"], correctIndex: 1 },
          { question: "What is the virtual DOM?", options: ["A real browser DOM", "A lightweight copy of DOM", "A database", "A CSS concept"], correctIndex: 1 },
        ],
      },
      {
        title: "Node.js Crash Course",
        description: "Learn Node.js and build backend APIs.",
        instructor: "Traversy Media",
        videoUrl: "https://www.youtube.com/embed/fBNz5xF-Kx4",
        thumbnail: "https://img.youtube.com/vi/fBNz5xF-Kx4/maxresdefault.jpg",
        category: "Programming", duration: "3h 00m",
        whatYouLearn: ["Node.js runtime", "NPM packages", "Express framework", "REST APIs", "File system module", "Connecting to MongoDB"],
        quiz: [
          { question: "Node.js runs on which engine?", options: ["SpiderMonkey", "V8", "Chakra", "Rhino"], correctIndex: 1 },
          { question: "What is Express.js?", options: ["A database", "A frontend framework", "A web framework for Node", "A CSS library"], correctIndex: 2 },
          { question: "Which command initializes a Node project?", options: ["node init", "npm start", "npm init", "node start"], correctIndex: 2 },
          { question: "What does res.json() do?", options: ["Reads a file", "Sends JSON response", "Connects to DB", "Handles errors"], correctIndex: 1 },
          { question: "What is middleware in Express?", options: ["A database layer", "Functions that run during request", "A frontend tool", "A testing tool"], correctIndex: 1 },
        ],
      },
    ]);
    console.log("Courses seeded with quiz and whatYouLearn data.");
  }
}

app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/course", require("./routes/courseRoutes"));
app.use("/api/enrollment", require("./routes/enrollmentRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));


app.get("/", (req, res) => res.json({ message: "LMS API running." }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
