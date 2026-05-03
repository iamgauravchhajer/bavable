require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ["gemini-1.5-pro-latest", "gemini-2.0-flash", "gemini-2.5-pro"];
  
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.generateContent("Hello");
      console.log(modelName, "works!");
    } catch(e) {
      console.error(modelName, "failed:", e.status);
    }
  }
}
main();
