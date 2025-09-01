export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

//for retrying when Gemini API fails
export const MAX_RETRIES = 3;
export const INITIAL_DELAY_MS = 300;

// Include a system instruction for the model's persona
export const systemInstruction = {
    parts: [{ text: `
You are a helpful assistant helping the user learn concepts. Respond in a clear and friendly manner.
Encourage the user to keep learning.
Use standard markdown formatting and LaTeX when necessary 
` }]
};