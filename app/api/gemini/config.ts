import { GoogleGenAI } from "@google/genai";

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
    maxOutputTokens: 8192
}


export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Model selection based on preferences
export const getLLMModel = (modelPreference: "normal" | "fast") => {
    return "gemini-2.5-flash";
};

// Get generation config based on model preference
export const getGenerationConfig = (modelPreference: "normal" | "fast") => {
    if (modelPreference === "fast") {
        return {
            temperature: 0.3, // Lower temperature for faster, more focused responses
            maxOutputTokens: 4096, // Shorter responses for speed
        };
    }
    return limitedGeneralConfig; // Default config for normal
};

// Default model for backward compatibility
export const llmModel = getLLMModel("normal");

