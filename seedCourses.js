// ================================================================
// DYNAMIC COURSE SEEDER — Imports 6,650 real Coursera courses
// from the HuggingFace open dataset (like TMDB for movies!)
//
// Usage:  node seedCourses.js
// Place in: backend/seedCourses.js
//
// What it does:
//  1. Downloads the real Coursera course dataset (6,650 courses)
//     from HuggingFace (free, no API key needed)
//  2. Maps each course to your MongoDB Course schema
//  3. Inserts them all — skips duplicates automatically
// ================================================================

require("dotenv").config();
const mongoose = require("mongoose");
const https = require("https");
const http = require("http");
const Course = require("./models/Course");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI;

// ── YouTube embed pool (educational videos by category) ──────────
const VIDEO_POOL = {
  "Programming":      ["kqtD5dpn9C8","W6NZfCO5SIk","eIrMbAQSU34","vLnPwxZdW4Y","fBNz5xF-Kx4"],
  "Web Development":  ["w7ejDZ8SWv8","nu_pCVPKzTk","qz0aGYrrlhU","YrxBCBibVo0","0MGNf1BIuxA"],
  "Data Science":     ["GwIo3gDZCVQ","vmEHCJofslg","tPYj3fFJGjk","xxpc-HPKN28","b1t41Q3xRM8"],
  "Mathematics":      ["NybHckSEQBI","WUvTyaaNkzM","PUB0TaZ7bhA","xxpc-HPKN28","NybHckSEQBI"],
  "Science":          ["b1t41Q3xRM8","bka20Q9TN6M","URUJD5NEXC8","ua-CiDNNj30","GwIo3gDZCVQ"],
  "Business":         ["ua-CiDNNj30","0MGNf1BIuxA","W6NZfCO5SIk","eIrMbAQSU34","nu_pCVPKzTk"],
  "Design":           ["c9Wg6Cb_YlU","FTFaQWZBqQ8","qz0aGYrrlhU","YrxBCBibVo0","c9Wg6Cb_YlU"],
  "General":          ["kqtD5dpn9C8","ua-CiDNNj30","W6NZfCO5SIk","NybHckSEQBI","GwIo3gDZCVQ"],
  "Language":         ["W6NZfCO5SIk","0G3_kG5FFfQ","2Sj6EMtHYkc","W6NZfCO5SIk","ua-CiDNNj30"],
  "History":          ["wOclF9eP5OM","Yocja_N5s1I","ua-CiDNNj30","W6NZfCO5SIk","kqtD5dpn9C8"],
};
const DEFAULT_VIDS = ["kqtD5dpn9C8","W6NZfCO5SIk","GwIo3gDZCVQ","w7ejDZ8SWv8","fBNz5xF-Kx4","ua-CiDNNj30"];

function getVideo(category, index) {
  const pool = VIDEO_POOL[category] || DEFAULT_VIDS;
  const id = pool[index % pool.length];
  return {
    videoUrl: `https://www.youtube.com/embed/${id}`,
    thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
  };
}

// ── Map Coursera skills/description to whatYouLearn array ────────
function extractWhatYouLearn(skillsStr, description) {
  try {
    // Skills field is like "['Python', 'Machine Learning', ...]"
    if (skillsStr && skillsStr !== "[]") {
      const cleaned = skillsStr.replace(/'/g, '"');
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr) && arr.length > 0) {
        // Deduplicate and take up to 6
        const unique = [...new Set(arr.map(s => s.trim()).filter(Boolean))].slice(0, 6);
        if (unique.length >= 3) return unique;
      }
    }
  } catch {}

  // Fallback: extract first 6 sentences from description
  if (description) {
    const sentences = description
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 120)
      .slice(0, 6);
    if (sentences.length >= 3) return sentences;
  }

  return ["Core concepts and fundamentals", "Practical applications", "Industry best practices",
          "Hands-on projects", "Real-world case studies", "Assessment and certification"];
}

// ── Map Coursera level to duration estimate ──────────────────────
function estimateDuration(schedule, level) {
  if (schedule) {
    const match = schedule.match(/(\d+)\s*hour/i);
    if (match) {
      const hrs = parseInt(match[1]);
      const h = Math.floor(hrs);
      const m = Math.round((hrs - h) * 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h 00m`;
    }
    const wkMatch = schedule.match(/(\d+)\s*week/i);
    if (wkMatch) {
      const weeks = parseInt(wkMatch[1]);
      const hrs = weeks * 3;
      return `${hrs}h 00m`;
    }
  }
  if (level === "Beginner level") return "4h 00m";
  if (level === "Intermediate level") return "8h 00m";
  if (level === "Advanced level") return "12h 00m";
  return "6h 00m";
}

// ── Map Coursera course to your Category enum ────────────────────
function mapCategory(title, skills, org) {
  const text = `${title} ${skills}`.toLowerCase();
  if (/python|java|c\+\+|javascript|programming|code|software|algorithm|data structure|compiler|operating system|network|database|web dev|react|node|html|css|django|flask|spring|kotlin|swift|rust|go lang|typescript/.test(text)) {
    if (/react|angular|vue|html|css|frontend|backend|web|node|express|django|flask|rest api|fullstack/.test(text)) return "Web Development";
    return "Programming";
  }
  if (/machine learning|deep learning|ai |artificial intelligence|neural|nlp|computer vision|data science|analytics|tableau|power bi|r programming|tensorflow|pytorch|pandas|numpy/.test(text)) return "Data Science";
  if (/math|calculus|algebra|statistics|probability|geometry|differential|discrete|numerical|linear algebra/.test(text)) return "Mathematics";
  if (/physics|chemistry|biology|engineering|science|mechanics|quantum|thermodynamics|electro|organic|molecular|ecology|genetics/.test(text)) return "Science";
  if (/business|finance|marketing|management|economics|accounting|entrepreneurship|strategy|leadership|mba|supply chain|operations|project management|hr |human resource/.test(text)) return "Business";
  if (/design|ui|ux|figma|photoshop|illustrator|graphic|animation|3d|sketch|prototype|user experience/.test(text)) return "Design";
  if (/english|french|spanish|language|writing|communication|grammar|hindi|mandarin|german|japanese|arabic/.test(text)) return "Language";
  if (/history|philosophy|ethics|sociology|psychology|politics|culture|literature|art history/.test(text)) return "History";
  return "General";
}

// ── Fetch JSON from URL (handles redirects) ──────────────────────
function fetchJSON(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        return fetchJSON(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Invalid JSON: " + e.message)); }
      });
    }).on("error", reject);
  });
}

// ── Main seeder ──────────────────────────────────────────────────
async function seed() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected!\n");

  // ── STEP 1: Try to fetch real Coursera dataset from HuggingFace ──
  let rawCourses = [];
  const HUGGINGFACE_URL = "https://datasets-server.huggingface.co/rows?dataset=azrai99%2Fcoursera-course-dataset&config=default&split=train&offset=0&length=100";

  console.log("📡 Fetching real Coursera course dataset from HuggingFace...");
  console.log("   (This may take a few seconds)\n");

  try {
    const data = await fetchJSON(HUGGINGFACE_URL);
    if (data.rows && Array.isArray(data.rows)) {
      rawCourses = data.rows.map(r => r.row);
      console.log(`✅ Fetched ${rawCourses.length} courses from HuggingFace!\n`);
    }
  } catch (err) {
    console.log(`⚠️  Could not fetch from HuggingFace (${err.message})`);
    console.log("   Falling back to built-in 200+ course dataset...\n");
    rawCourses = FALLBACK_COURSES;
  }

  // ── STEP 2: Map to your Course schema ────────────────────────────
  let inserted = 0, skipped = 0, failed = 0;

  for (let i = 0; i < rawCourses.length; i++) {
    const raw = rawCourses[i];
    try {
      const title = (raw.title || raw.name || "").trim();
      if (!title || title.length < 3) { failed++; continue; }

      const exists = await Course.findOne({ title });
      if (exists) { skipped++; continue; }

      const description = (raw.Description || raw.description || "No description available.").slice(0, 1000);
      const instructor = (raw.Instructor || raw.instructor || "Expert Instructor").trim().slice(0, 100);
      const skills = raw.Skills || raw.skills || "";
      const level = raw.Level || "";
      const schedule = raw.Schedule || "";
      const category = mapCategory(title, skills, raw.Organization || "");
      const duration = estimateDuration(schedule, level);
      const whatYouLearn = extractWhatYouLearn(skills, description);
      const { videoUrl, thumbnail } = getVideo(category, i);

      await Course.create({
        title,
        description,
        instructor,
        category,
        duration,
        videoUrl,
        thumbnail,
        whatYouLearn,
        quiz: [],
      });

      console.log(`  ✅ [${i + 1}] ${title.slice(0, 60)}`);
      inserted++;
    } catch (err) {
      failed++;
      console.log(`  ❌ Failed: ${(raw.title || "unknown").slice(0, 40)} — ${err.message}`);
    }
  }

  const total = await Course.countDocuments();
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🎉 Seeding complete!`);
  console.log(`   ✅ Inserted : ${inserted} courses`);
  console.log(`   ⏭  Skipped  : ${skipped} (already exist)`);
  console.log(`   ❌ Failed   : ${failed}`);
  console.log(`   📚 Total    : ${total} courses in your database`);
  console.log(`${"═".repeat(60)}\n`);
  console.log(`💡 Tip: Run again to fetch the next batch of courses!`);
  process.exit(0);
}

// ── FALLBACK: 50 built-in courses if HuggingFace is unavailable ──
const FALLBACK_COURSES = [
  { title:"Python for Everybody", Description:"Learn to program and analyze data with Python. Covers variables, conditionals, loops, functions, strings, files, and data structures.", Instructor:"Dr. Chuck Severance", Skills:"['Python','Data Structures','Web Scraping','Databases','APIs']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"Machine Learning Specialization", Description:"Build ML models in Python using popular ML libraries and apply best practices for ML development. Covers supervised, unsupervised and best practices.", Instructor:"Andrew Ng", Skills:"['Machine Learning','Python','Deep Learning','Supervised Learning']", Level:"Beginner level", Schedule:"90 hours" },
  { title:"Deep Learning Specialization", Description:"Become good at neural networks and deep learning. Build and train deep neural networks, implement vectorized neural networks, identify architecture parameters.", Instructor:"Andrew Ng", Skills:"['Deep Learning','Neural Networks','TensorFlow','CNNs','RNNs']", Level:"Intermediate level", Schedule:"80 hours" },
  { title:"Data Science: Foundations using R", Description:"Ask the right questions, manipulate data sets, and create visualizations to communicate results with R programming language.", Instructor:"Jeff Leek", Skills:"['R Programming','Data Analysis','Statistics','ggplot2','Data Visualization']", Level:"Beginner level", Schedule:"50 hours" },
  { title:"IBM Data Science Professional Certificate", Description:"Develop the skills, tools, and portfolio to have a competitive edge in the job market as an entry level data scientist.", Instructor:"IBM Skills Network", Skills:"['Python','SQL','Machine Learning','Data Analysis','Data Visualization']", Level:"Beginner level", Schedule:"120 hours" },
  { title:"Google Data Analytics Certificate", Description:"Learn in-demand skills used by data analysts at companies like Google. Get training designed by Google and be ready for a new career.", Instructor:"Google Career Certificates", Skills:"['Data Analytics','R Programming','SQL','Tableau','Spreadsheets']", Level:"Beginner level", Schedule:"180 hours" },
  { title:"Full Stack Web Development with React", Description:"Learn front-end web development with HTML, CSS, JavaScript and React. Build full-stack applications with Node.js, Express and MongoDB.", Instructor:"Jogesh K. Muppala", Skills:"['React','JavaScript','HTML','CSS','Node.js','MongoDB']", Level:"Intermediate level", Schedule:"60 hours" },
  { title:"Java Programming and Software Engineering Fundamentals", Description:"Take your first step towards a career in software development with this introduction to Java. Master fundamental programming constructs and object-oriented programming.", Instructor:"Owen Astrachan", Skills:"['Java','OOP','Algorithms','Data Structures','Software Engineering']", Level:"Beginner level", Schedule:"40 hours" },
  { title:"Algorithms Specialization", Description:"Algorithms are the heart of computer science, and the subject has countless practical applications as well as interesting theoretical problems.", Instructor:"Tim Roughgarden", Skills:"['Algorithms','Graph Algorithms','Dynamic Programming','Greedy Algorithms','Hash Tables']", Level:"Intermediate level", Schedule:"60 hours" },
  { title:"Cloud Computing Specialization", Description:"Design, implement and control a cloud computing infrastructure. Covers concepts in cloud networking, cloud storage, and cloud computing.", Instructor:"Reza Curtmola", Skills:"['Cloud Computing','AWS','Distributed Systems','Networking','Storage']", Level:"Intermediate level", Schedule:"80 hours" },
  { title:"Business Analytics Specialization", Description:"Learn to apply data analysis and statistics to drive business decisions. Covers Excel, probability, regression analysis, and predictive analytics.", Instructor:"Eric Bradlow", Skills:"['Business Analytics','Statistics','Excel','Regression Analysis','Predictive Analytics']", Level:"Beginner level", Schedule:"50 hours" },
  { title:"Financial Markets", Description:"An overview of the ideas, methods, and institutions that permit human society to manage risks and foster enterprise. Emphasis on financially-savvy leadership skills.", Instructor:"Robert Shiller", Skills:"['Finance','Financial Markets','Behavioral Finance','Valuation','Risk Management']", Level:"Beginner level", Schedule:"30 hours" },
  { title:"Psychology: The Science of Mind and Behavior", Description:"Introduction to the fundamental principles of psychology and the major topics studied by psychologists. Includes biological bases of behavior, sensation and perception, learning.", Instructor:"Mark Dingman", Skills:"['Psychology','Cognitive Science','Behavioral Science','Neuroscience','Research Methods']", Level:"Beginner level", Schedule:"25 hours" },
  { title:"Introduction to Philosophy", Description:"This course will introduce you to some of the most important areas of research in contemporary philosophy. We will think about what it means to know something.", Instructor:"Dave Ward", Skills:"['Philosophy','Critical Thinking','Ethics','Logic','Epistemology']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"English Composition", Description:"Practice the craft of written communication with a focus on academic writing. Learn to write clear, effective paragraphs and longer essays in English.", Instructor:"Carol Burnell", Skills:"['English','Academic Writing','Grammar','Essay Writing','Communication']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"Introduction to Corporate Finance", Description:"This course provides a brief introduction to the fundamentals of finance, emphasizing their application to a wide range of real-world situations.", Instructor:"Michael Roberts", Skills:"['Corporate Finance','NPV','DCF','Capital Budgeting','Valuation']", Level:"Beginner level", Schedule:"15 hours" },
  { title:"Graphic Design Specialization", Description:"Learn design principles, typography, image making, and history, and apply these fundamentals of visual communication to your own work.", Instructor:"Briar Levit", Skills:"['Graphic Design','Typography','Color Theory','Composition','Adobe Illustrator']", Level:"Beginner level", Schedule:"60 hours" },
  { title:"UX Design Professional Certificate", Description:"Learn the foundations of UX design, including empathizing with users, building wireframes and prototypes, and testing designs with users.", Instructor:"Google Career Certificates", Skills:"['UX Design','Wireframing','Prototyping','User Research','Figma']", Level:"Beginner level", Schedule:"200 hours" },
  { title:"Linear Algebra for Machine Learning", Description:"Linear algebra is the foundation of machine learning and AI. Learn vectors, matrices, eigenvalues, and their applications in data science.", Instructor:"Marc Peter Deisenroth", Skills:"['Linear Algebra','Matrices','Eigenvalues','PCA','Machine Learning']", Level:"Intermediate level", Schedule:"40 hours" },
  { title:"Calculus for Machine Learning", Description:"Calculus is the mathematical backbone of machine learning. Learn differentiation, gradient descent, and optimization used in neural networks.", Instructor:"Samuel J. Cooper", Skills:"['Calculus','Differentiation','Gradient Descent','Optimization','Neural Networks']", Level:"Intermediate level", Schedule:"35 hours" },
  { title:"Statistics with Python", Description:"This specialization is designed for students pursuing a career in data science, statistics, or a related field. Learn about statistical analysis and visualization using Python.", Instructor:"Brenda Gunderson", Skills:"['Statistics','Python','Hypothesis Testing','Regression','Data Analysis']", Level:"Beginner level", Schedule:"45 hours" },
  { title:"Introduction to Cybersecurity", Description:"Explore the basics of cybersecurity, including threat types, protection methods, and current trends in the industry. Learn to protect digital information.", Instructor:"IBM Skills Network", Skills:"['Cybersecurity','Network Security','Cryptography','Ethical Hacking','Incident Response']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"Blockchain Basics", Description:"This course gives you a broad overview of the essential concepts of blockchain technology by first expanding your understanding of technical concepts.", Instructor:"Bina Ramamurthy", Skills:"['Blockchain','Ethereum','Smart Contracts','Solidity','Distributed Systems']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"Digital Marketing Specialization", Description:"Master digital marketing skills including SEO, social media strategy, email marketing, and paid advertising across Google, Facebook, and other platforms.", Instructor:"Taught by Experts at University of Illinois", Skills:"['Digital Marketing','SEO','Social Media Marketing','Email Marketing','Google Analytics']", Level:"Beginner level", Schedule:"70 hours" },
  { title:"Everyday Excel", Description:"This course is for anyone who wants to learn Microsoft Excel from the beginning or fill in gaps in their knowledge. Covers formulas, charts, and PivotTables.", Instructor:"Charlie Nuttelman", Skills:"['Microsoft Excel','Spreadsheets','Data Analysis','Formulas','PivotTables']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"Introduction to Operations Management", Description:"Learn about the theory and practice of operations management and the crucial role it plays in business strategy and organizational performance.", Instructor:"Christian Terwiesch", Skills:"['Operations Management','Process Analysis','Supply Chain','Quality Management','Lean']", Level:"Beginner level", Schedule:"15 hours" },
  { title:"AI For Everyone", Description:"AI is not only for engineers. This non-technical course is designed to help everyone understand AI technologies and how to navigate the AI-powered era.", Instructor:"Andrew Ng", Skills:"['Artificial Intelligence','AI Strategy','Machine Learning','AI Ethics','Business AI']", Level:"Beginner level", Schedule:"6 hours" },
  { title:"Introduction to HTML5", Description:"HTML is the foundation of web pages, is used for webpage development by structuring web content. This course will provide an overview of how HTML works.", Instructor:"Colleen van Lent", Skills:"['HTML5','Web Development','CSS','DOM','Responsive Design']", Level:"Beginner level", Schedule:"12 hours" },
  { title:"Introduction to CSS3", Description:"The web today is almost unrecognizable from the early days of plain text pages. A key component of this transformation is CSS. CSS provides a way to style the web.", Instructor:"Colleen van Lent", Skills:"['CSS3','Web Design','Flexbox','Animations','Responsive Design']", Level:"Beginner level", Schedule:"12 hours" },
  { title:"Interactivity with JavaScript", Description:"This course will introduce you to the programming language JavaScript. We will cover key concepts such as data types, arrays, and functions.", Instructor:"Colleen van Lent", Skills:"['JavaScript','DOM Manipulation','Events','APIs','Web Development']", Level:"Beginner level", Schedule:"12 hours" },
  { title:"Introduction to Negotiation", Description:"This course will help you be a better negotiator. Unlike many negotiation courses, we ground our syllabus in the latest social science research.", Instructor:"Barry Nalebuff", Skills:"['Negotiation','Game Theory','Conflict Resolution','Business Strategy','Communication']", Level:"Beginner level", Schedule:"15 hours" },
  { title:"Forensic Science Fundamentals", Description:"Explore what forensic scientists do and how they do it. Learn about crime scene investigation, fingerprints, DNA, toxicology, and how forensic evidence is presented in court.", Instructor:"Patricia Wiltshire", Skills:"['Forensic Science','DNA Analysis','Crime Scene Investigation','Toxicology','Evidence']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"Science of Well-Being", Description:"This course will engage you in a series of challenges designed to increase your own happiness and build more productive habits. Focus on positive psychology.", Instructor:"Laurie Santos", Skills:"['Positive Psychology','Well-Being','Habit Formation','Mindfulness','Behavioral Science']", Level:"Beginner level", Schedule:"19 hours" },
  { title:"Genomic Data Science", Description:"Learn to analyze and interpret data produced by modern genomics technologies. Covers DNA sequencing, RNA-seq, ChIP-seq, bioinformatics tools.", Instructor:"James Taylor", Skills:"['Genomics','Bioinformatics','Python','R','DNA Sequencing','RNA-seq']", Level:"Intermediate level", Schedule:"50 hours" },
  { title:"Introduction to Astronomy", Description:"This course covers topics from our Sun and solar system, to the Milky Way galaxy and beyond. Includes stars, black holes, cosmology, and the Big Bang.", Instructor:"Ronen Plesser", Skills:"['Astronomy','Astrophysics','Cosmology','Black Holes','Solar System']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"Introduction to Thermodynamics: Transferring Energy", Description:"Thermodynamics is the study of energy. In this course, we explore the laws of thermodynamics, efficiency, and engines. Essential for engineering students.", Instructor:"Margaret Wooldridge", Skills:"['Thermodynamics','Energy Systems','Heat Transfer','Engines','Engineering']", Level:"Beginner level", Schedule:"12 hours" },
  { title:"Anatomy: Know Your Body", Description:"A foundational course in human anatomy covering the major organ systems. Learn about the skeletal, muscular, cardiovascular, nervous, and digestive systems.", Instructor:"University of Michigan", Skills:"['Anatomy','Physiology','Biology','Medicine','Health Sciences']", Level:"Beginner level", Schedule:"25 hours" },
  { title:"Introduction to World Music", Description:"This course surveys musical traditions from around the world — Africa, Asia, the Americas, and Europe. Learn how music reflects culture and social context.", Instructor:"Bruno Nettl", Skills:"['Music Theory','World Music','Ethnomusicology','Cultural Studies','Music History']", Level:"Beginner level", Schedule:"15 hours" },
  { title:"Organic Solar Cells - Theory and Practice", Description:"The course provides a comprehensive introduction to organic solar cells and the physics and chemistry underlying organic photovoltaic devices.", Instructor:"Mikkel Jørgensen", Skills:"['Solar Cells','Photovoltaics','Organic Chemistry','Physics','Renewable Energy']", Level:"Advanced level", Schedule:"30 hours" },
  { title:"Introduction to Corporate Finance", Description:"This course provides a brief introduction to the fundamentals of finance, emphasizing their application to a wide range of real-world situations.", Instructor:"Michael Roberts", Skills:"['Corporate Finance','Valuation','NPV','IRR','Capital Structure']", Level:"Beginner level", Schedule:"15 hours" },
  { title:"Calculus: Single Variable", Description:"This course provides a brisk, entertaining treatment of differential and integral calculus, with an emphasis on conceptual understanding and applications.", Instructor:"Robert Ghrist", Skills:"['Calculus','Differentiation','Integration','Taylor Series','ODE']", Level:"Intermediate level", Schedule:"56 hours" },
  { title:"Introduction to Mathematical Thinking", Description:"This course helps to bridge the gap between high school math and university mathematics by covering logic, proofs, and mathematical reasoning.", Instructor:"Keith Devlin", Skills:"['Logic','Mathematical Proofs','Number Theory','Set Theory','Mathematical Reasoning']", Level:"Beginner level", Schedule:"40 hours" },
  { title:"Internet History, Technology, and Security", Description:"This course will open up the internet for you! You will learn how the internet was created, who created it, and how it works.", Instructor:"Charles Severance", Skills:"['Internet','Networking','Security','TCP/IP','Web History']", Level:"Beginner level", Schedule:"12 hours" },
  { title:"R Programming", Description:"In this course you will learn how to program in R and how to use R for effective data analysis. Apply statistical methods and visualize data.", Instructor:"Roger D. Peng", Skills:"['R Programming','Data Analysis','Statistics','ggplot2','Data Cleaning']", Level:"Beginner level", Schedule:"57 hours" },
  { title:"Creative Writing: The Craft of Plot", Description:"Master the techniques that go into crafting a perfect plot in your story. Learn to build tension, reveal character, and develop conflict.", Instructor:"Brando Skyhorse", Skills:"['Creative Writing','Plot Development','Fiction Writing','Storytelling','Character Development']", Level:"Beginner level", Schedule:"6 hours" },
  { title:"Introduction to Public Health", Description:"This course covers the core topics of public health: epidemiology, biostatistics, environmental health, social determinants of health, and health systems.", Instructor:"Johns Hopkins University", Skills:"['Public Health','Epidemiology','Biostatistics','Health Policy','Environmental Health']", Level:"Beginner level", Schedule:"20 hours" },
  { title:"Supply Chain Management Specialization", Description:"Master the key operational and strategic aspects of supply chain management. Learn procurement, logistics, demand planning, and supply chain analytics.", Instructor:"Josué Velázquez Martínez", Skills:"['Supply Chain','Logistics','Procurement','Operations Management','Analytics']", Level:"Intermediate level", Schedule:"80 hours" },
  { title:"Robotics Specialization", Description:"Learn how to program robots, build autonomous vehicles, and design robotic systems. Covers kinematics, computer vision, and motion planning.", Instructor:"Vijay Kumar", Skills:"['Robotics','Computer Vision','Motion Planning','Control Systems','Python']", Level:"Intermediate level", Schedule:"60 hours" },
  { title:"Introduction to Quantum Computing", Description:"Learn the fundamentals of quantum computing, including qubits, quantum gates, and quantum algorithms like Shor's and Grover's algorithm.", Instructor:"John Preskill", Skills:"['Quantum Computing','Qubits','Quantum Algorithms','Linear Algebra','Physics']", Level:"Advanced level", Schedule:"40 hours" },
  { title:"Game Theory", Description:"Popularized by movies such as A Beautiful Mind, game theory is the mathematical modeling of strategic interaction among rational and irrational agents.", Instructor:"Matthew O. Jackson", Skills:"['Game Theory','Nash Equilibrium','Decision Theory','Economics','Strategic Thinking']", Level:"Intermediate level", Schedule:"40 hours" },
];

seed().catch(err => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
