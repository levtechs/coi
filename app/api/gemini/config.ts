import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// ==== settings ====

//for retrying when Gemini API fails
export const MAX_RETRIES = 3;
export const INITIAL_DELAY_MS = 300;

export const defaultGeneralConfig = {
    temperature: 0.7,
}

export const limitedGeneralConfig = {
    temperature: 0.7,
    maxOutputTokens: 4096
}


export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const llmModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

