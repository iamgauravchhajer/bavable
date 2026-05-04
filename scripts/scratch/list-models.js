require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
  const keys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(k => k.length > 0);
  const apiKey = keys[0];
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // There is no direct listModels in the high-level SDK easily accessible like this
    // but we can try common names.
    const models = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-1.5-pro-latest",
      "gemini-pro",
      "gemini-pro-vision",
      "gemini-2.0-flash-exp",
      "gemini-flash-lite-latest"
    ];

    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        await model.generateContent("test");
        console.log(`✅ ${m} works!`);
      } catch (e) {
        console.log(`❌ ${m} failed: ${e.message.substring(0, 50)}...`);
      }
    }
  } catch (e) {
    console.error("Fatal error:", e);
  }
}

main();
