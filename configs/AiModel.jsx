const {
    GoogleGenerativeAI,
} = require("@google/generative-ai");

const getApiKeys = () => {
    const keys = process.env.GEMINI_API_KEY || "";
    return keys.split(",").map(key => key.trim()).filter(key => key.length > 0);
};

const getModel = (keyIndex = 0, config = {}) => {
    const keys = getApiKeys();
    const apiKey = keys[keyIndex] || keys[0];
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: "gemini-flash-lite-latest",
        ...config
    });
};

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

const CodeGenerationConfig = {
    temperature: 0.85,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
};

const EnhancePromptConfig = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1000,
    responseMimeType: "text/plain",
};

export const createChatSession = (keyIndex = 0) => 
    getModel(keyIndex).startChat({
        generationConfig,
        history: [],
    });

export const createCodeGenerationSession = (keyIndex = 0) => 
    getModel(keyIndex, { responseMimeType: "application/json" }).startChat({
        generationConfig: CodeGenerationConfig,
        history: [],
    });

export const createEnhancePromptSession = (keyIndex = 0) => 
    getModel(keyIndex).startChat({
        generationConfig: EnhancePromptConfig,
        history: [],
    });

export { getApiKeys };

