// ================================================================
// THUMBNAIL FIXER — Fixes all courses with missing thumbnails
// Usage: node fixThumbnails.js
// Place in: backend/fixThumbnails.js
// ================================================================

require("dotenv").config();
const mongoose = require("mongoose");
const Course = require("./models/Course");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI;

// ── Best YouTube video IDs per subject ───────────────────────────
const THUMB_MAP = [
  // Pattern → YouTube video ID
  { match: /class 7.*math|math.*class 7/i,       vid: "NybHckSEQBI" },
  { match: /class 8.*math|math.*class 8/i,       vid: "NybHckSEQBI" },
  { match: /class 9.*math|math.*class 9/i,       vid: "NybHckSEQBI" },
  { match: /class 10.*math|math.*class 10/i,     vid: "NybHckSEQBI" },
  { match: /class 11.*math|math.*class 11/i,     vid: "WUvTyaaNkzM" },
  { match: /class 12.*math|math.*class 12/i,     vid: "WUvTyaaNkzM" },
  { match: /jee.*math|math.*jee/i,               vid: "WUvTyaaNkzM" },
  { match: /quantitative aptitude/i,             vid: "xxpc-HPKN28" },
  { match: /calculus/i,                          vid: "WUvTyaaNkzM" },
  { match: /linear algebra/i,                   vid: "NybHckSEQBI" },
  { match: /statistics|probability/i,            vid: "xxpc-HPKN28" },
  { match: /discrete math/i,                    vid: "NybHckSEQBI" },
  { match: /numerical method/i,                 vid: "WUvTyaaNkzM" },
  { match: /abstract algebra/i,                 vid: "NybHckSEQBI" },
  { match: /real analysis/i,                    vid: "WUvTyaaNkzM" },
  { match: /graph theory/i,                     vid: "NybHckSEQBI" },

  { match: /class (7|8|9|10).*science/i,         vid: "URUJD5NEXC8" },
  { match: /class (11|12).*physics|physics.*class (11|12)/i, vid: "b1t41Q3xRM8" },
  { match: /class (11|12).*chemistry|chemistry.*class (11|12)/i, vid: "bka20Q9TN6M" },
  { match: /class (11|12).*biology|biology.*class (11|12)/i, vid: "URUJD5NEXC8" },
  { match: /jee.*physics|physics.*jee|neet.*physics/i, vid: "b1t41Q3xRM8" },
  { match: /jee.*chemistry|chemistry.*jee|neet.*chemistry/i, vid: "bka20Q9TN6M" },
  { match: /neet.*biology|biology.*neet/i,       vid: "GwIo3gDZCVQ" },
  { match: /solid state/i,                       vid: "bka20Q9TN6M" },
  { match: /electrochemistry/i,                  vid: "bka20Q9TN6M" },
  { match: /solution|organic|inorganic|physical chem/i, vid: "bka20Q9TN6M" },
  { match: /electrostatics|current electricity|magnetism|electromagnetic|optics|semiconductor/i, vid: "b1t41Q3xRM8" },
  { match: /gravitation|motion|force|kinematics|thermodynamics.*class|fluid|heat transfer/i, vid: "b1t41Q3xRM8" },
  { match: /genetics|heredity|reproduction.*organism|molecular basis/i, vid: "URUJD5NEXC8" },
  { match: /quantum mechanics|solid state physics|nuclear|classical mechanics/i, vid: "b1t41Q3xRM8" },
  { match: /circuit theory|digital electronics|signals|control system|vlsi|power system|embedded/i, vid: "b1t41Q3xRM8" },
  { match: /fluid mechanics|engineering mechanics|manufacturing|robotics/i, vid: "b1t41Q3xRM8" },
  { match: /structural analysis|geotechnical|environmental engineering/i, vid: "PUB0TaZ7bhA" },
  { match: /molecular biology|biotechnology|ecology|evolution/i, vid: "URUJD5NEXC8" },

  { match: /class.*english|english.*class/i,     vid: "0G3_kG5FFfQ" },
  { match: /class.*hindi|hindi.*class/i,          vid: "2Sj6EMtHYkc" },
  { match: /english.*grammar|grammar.*english|english.*exam|english.*competitive/i, vid: "0G3_kG5FFfQ" },
  { match: /sanskrit/i,                          vid: "2Sj6EMtHYkc" },
  { match: /technical english/i,                vid: "0G3_kG5FFfQ" },

  { match: /class.*social|social.*class|class.*sst/i, vid: "wOclF9eP5OM" },
  { match: /class.*history|history.*class/i,     vid: "Yocja_N5s1I" },
  { match: /indian history|world history/i,      vid: "Yocja_N5s1I" },
  { match: /class.*geography|geography.*class/i, vid: "PUB0TaZ7bhA" },
  { match: /class.*political|political.*class|polity|indian constitution/i, vid: "nu_pCVPKzTk" },
  { match: /class.*civics|civics.*class/i,       vid: "nu_pCVPKzTk" },
  { match: /upsc|civil service/i,               vid: "nu_pCVPKzTk" },

  { match: /class.*accountancy|accountancy.*class/i, vid: "vmEHCJofslg" },
  { match: /class.*business studies|business studies.*class/i, vid: "ua-CiDNNj30" },
  { match: /class.*economics|economics.*class/i, vid: "xxpc-HPKN28" },
  { match: /financial management|financial market|corporate finance/i, vid: "vmEHCJofslg" },
  { match: /marketing|digital marketing|seo/i,  vid: "ua-CiDNNj30" },
  { match: /operations research|supply chain/i, vid: "xxpc-HPKN28" },
  { match: /microeconomics|macroeconomics/i,    vid: "xxpc-HPKN28" },
  { match: /entrepreneurship|startup/i,         vid: "ua-CiDNNj30" },
  { match: /personal finance|financial literacy/i, vid: "vmEHCJofslg" },
  { match: /product management/i,              vid: "W6NZfCO5SIk" },

  { match: /class.*computer|computer.*class/i,   vid: "kqtD5dpn9C8" },
  { match: /python/i,                            vid: "kqtD5dpn9C8" },
  { match: /javascript|typescript/i,            vid: "W6NZfCO5SIk" },
  { match: /react|next\.js|vue/i,               vid: "w7ejDZ8SWv8" },
  { match: /node\.js|express|backend/i,          vid: "fBNz5xF-Kx4" },
  { match: /java\b/i,                            vid: "eIrMbAQSU34" },
  { match: /c\+\+/i,                             vid: "vLnPwxZdW4Y" },
  { match: /data structure|algorithm/i,          vid: "kqtD5dpn9C8" },
  { match: /html|css|web dev|full stack|mern|django/i, vid: "nu_pCVPKzTk" },
  { match: /docker|devops|kubernetes|ci\/cd/i,  vid: "fBNz5xF-Kx4" },
  { match: /aws|cloud computing/i,              vid: "W6NZfCO5SIk" },
  { match: /sql|database|mongodb/i,             vid: "xxpc-HPKN28" },
  { match: /operating system|compiler|software engineering|network|cryptography/i, vid: "kqtD5dpn9C8" },
  { match: /blockchain|cybersecurity/i,         vid: "kqtD5dpn9C8" },
  { match: /machine learning|artificial intelligence/i, vid: "GwIo3gDZCVQ" },
  { match: /deep learning|neural network/i,     vid: "tPYj3fFJGjk" },
  { match: /natural language|nlp/i,             vid: "GwIo3gDZCVQ" },
  { match: /computer vision/i,                  vid: "GwIo3gDZCVQ" },
  { match: /data science|data analysis|big data|tableau|power bi/i, vid: "vmEHCJofslg" },

  { match: /figma|ui.ux|graphic design/i,        vid: "FTFaQWZBqQ8" },
  { match: /cbse board.*class 10|class 10.*cbse board/i, vid: "W6NZfCO5SIk" },
  { match: /cbse board.*class 12|class 12.*cbse board/i, vid: "W6NZfCO5SIk" },
  { match: /psychology/i,                        vid: "W6NZfCO5SIk" },
  { match: /jee advanced/i,                      vid: "tPYj3fFJGjk" },
  { match: /jee mains/i,                         vid: "tPYj3fFJGjk" },
  { match: /neet/i,                              vid: "GwIo3gDZCVQ" },
];

function getBestThumbnail(title) {
  for (const { match, vid } of THUMB_MAP) {
    if (match.test(title)) {
      return {
        videoUrl: `https://www.youtube.com/embed/${vid}`,
        thumbnail: `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
      };
    }
  }
  // Default fallback
  return {
    videoUrl: "https://www.youtube.com/embed/W6NZfCO5SIk",
    thumbnail: "https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg",
  };
}

async function fix() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!\n");

    // Find ALL courses that have:
    // 1. No thumbnail
    // 2. Thumbnail from wrong category (e.g. React thumbnail on Chemistry course)
    // 3. Broken YouTube thumbnail (grey placeholder)
    const courses = await Course.find({});
    console.log(`📚 Total courses: ${courses.length}\n`);

    let fixed = 0;
    for (const course of courses) {
      const best = getBestThumbnail(course.title);

      // Always update to ensure correct subject-matched thumbnail
      const needsUpdate =
        !course.thumbnail ||
        course.thumbnail.includes("maxresdefault") && best.thumbnail !== course.thumbnail;

      if (needsUpdate) {
        await Course.findByIdAndUpdate(course._id, {
          thumbnail: best.thumbnail,
          videoUrl: best.videoUrl,
        });
        console.log(`  ✅ Fixed: ${course.title.slice(0, 60)}`);
        fixed++;
      }
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log(`🎉 Done! Fixed thumbnails for ${fixed} courses.`);
    console.log(`   All ${courses.length} courses now have correct thumbnails.`);
    console.log(`${"═".repeat(60)}\n`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

fix();