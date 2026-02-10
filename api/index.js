import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

// Ensure these are set in your .env file
const EMAIL = process.env.EMAIL || "your_chitkara_email@chitkara.edu.in"; 
const GEMINI_KEY = process.env.GEMINI_API_KEY;

/* ---------- Math helpers ---------- */
const fibonacci = (n) => {
  const res = [];
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    res.push(a);
    [a, b] = [b, a + b];
  }
  return res;
};

const isPrime = (num) => {
  if (num < 2) return false;
  for (let i = 2; i * i <= num; i++) {
    if (num % i === 0) return false;
  }
  return true;
};

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm = (a, b) => (a === 0 || b === 0) ? 0 : Math.abs(a * b) / gcd(a, b);

/* ---------- Gemini AI helper (FIXED) ---------- */
/* ---------- Gemini AI helper ---------- */
const getAIResponse = async (question) => {
  // CHANGED: gemini-1.5-flash is retired. Use gemini-3-flash-preview.
  const model = "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

  const payload = {
    contents: [{
      parts: [{ text: `Answer in exactly one word: ${question}` }]
    }]
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" }
    });

    const aiText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) throw new Error("API returned no content");

    // Returns just the first word, cleaned of punctuation
    return aiText.replace(/[^\w\s]/g, "").trim().split(/\s+/)[0];

  } catch (err) {
    console.error("REAL ERROR FROM GOOGLE:", err.response?.data || err.message);
    // Return a fallback instead of crashing the whole server
    return "AI_Service_Error"; 
  }
};
/* ---------- POST /bfhl ---------- */
app.post("/bfhl", async (req, res) => {
  try {
    const body = req.body;
    const keys = Object.keys(body);

    // Requirement: Exactly one key per request [cite: 32]
    if (keys.length !== 1) {
      return res.status(400).json({
        is_success: false,
        message: "Request must contain exactly one key"
      });
    }

    let data;
    const key = keys[0];

    switch (key) {
      case "fibonacci": {
        const n = Number(body.fibonacci);
        if (isNaN(n) || n < 0) return res.status(400).json({ is_success: false });
        data = fibonacci(n);
        break;
      }
      case "prime": {
        if (!Array.isArray(body.prime)) return res.status(400).json({ is_success: false });
        data = body.prime.filter(isPrime);
        break;
      }
      case "lcm": {
        if (!Array.isArray(body.lcm)) return res.status(400).json({ is_success: false });
        data = body.lcm.reduce((a, b) => lcm(a, b));
        break;
      }
      case "hcf": {
        if (!Array.isArray(body.hcf)) return res.status(400).json({ is_success: false });
        data = body.hcf.reduce((a, b) => gcd(a, b));
        break;
      }
      case "AI": {
        if (typeof body.AI !== "string" || body.AI.trim() === "") {
          return res.status(400).json({ is_success: false });
        }
        data = await getAIResponse(body.AI);
        break;
      }
      default:
        return res.status(400).json({ is_success: false });
    }

    // Mandatory Response Structure [cite: 35, 36, 40]
    res.json({
      is_success: true,
      official_email: EMAIL,
      data: data
    });
  } catch (err) {
    // Better error logging for debugging AI failures
    console.error("API ERROR:", err.response?.data || err.message);
    res.status(500).json({
      is_success: false,
      message: "Internal Server Error"
    });
  }
});

/* ---------- GET /health ---------- */
app.get("/health", (req, res) => {
  res.json({
    is_success: true,
    official_email: EMAIL // Required per health example [cite: 97]
  });
});

// app.listen(process.env.PORT || 3000, () => {
//   console.log("Server running");
// });

module.exports=app;
