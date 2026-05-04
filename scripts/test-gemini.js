require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
  const keys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(k => k.length > 0);
  console.log(`Found ${keys.length} API keys.`);

  for (let i = 0; i < keys.length; i++) {
    console.log(`\nTesting Key ${i + 1}: ${keys[i].substring(0, 8)}...`);
    const genAI = new GoogleGenerativeAI(keys[i]);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    try {
      const result = await model.generateContent("Hello, are you working?");
      console.log(`✅ Key ${i + 1} works! Response:`, result.response.text().substring(0, 30) + "...");
    } catch (e) {
      console.error(`❌ Key ${i + 1} failed:`, e.message);
      if (e.message.includes('429')) {
        console.log("Status: Rate Limited - would rotate in production.");
      }
    }
  }
}

main();

