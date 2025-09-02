import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Message } from "@/lib/types"; // { content: string; isResponse: boolean }
import { GEMINI_API_URL, chatResponseSystemInstruction, genContentSystemInstruction, defaultGeneralConfig, INITIAL_DELAY_MS, MAX_RETRIES} from "./config";
import { Contents } from "./types";

export const writeChatPairToDb = async (
    message: string,
    result: string,
    projectId: string,
    uid: string
) => {
    try {
        const chatRef = doc(db, "projects", projectId, "chats", uid);

        const chatSnap = await getDoc(chatRef);

        let existingMessages: Message[] = [];
        if (chatSnap.exists()) {
            existingMessages = chatSnap.data().messages || [];
        }

        const newMessages: Message[] = [
            ...existingMessages,
            { content: message, isResponse: false },
            { content: result, isResponse: true }
        ];

        if (chatSnap.exists()) {
            await updateDoc(chatRef, { messages: newMessages });
        } else {
            await setDoc(chatRef, { messages: newMessages });
        }
    } catch (err) {
        console.error("Error writing chat to DB:", err);
        throw err;
    }
};

/**
 * Writes a new content entry to the project's content collection.
 * @param newContent The content string to store.
 * @param projectId The ID of the project where this content belongs.
 */
export const writeNewContentToDb = async (
    newContent: string,
    projectId: string
) => {
    if (!newContent || !projectId) throw new Error("Missing content or projectId");

    try {
        // --- Write to the 'content' subcollection for historical tracking ---
        const contentHistoryColRef = collection(db, "projects", projectId, "content");
        await addDoc(contentHistoryColRef, {
            content: newContent,
            createdAt: serverTimestamp()
        });

        // --- Write to a single document for the main content view ---
        const mainContentDocRef = doc(db, "projects", projectId);
        await setDoc(mainContentDocRef, {
             content: newContent,
             updatedAt: serverTimestamp()
        }, { merge: true });

        console.log("New content written successfully to history and main document.");
    } catch (err) {
        console.error("Error writing new content to DB:", err);
        throw err;
    }
};

export const getChatResponse = async (message: string, messageHistory: Message[]) => {
    // Ensure the current message is not empty
    if (!message || message.trim() === "") {
        throw("Message is required.");
    }

    // The Gemini API expects a structured array of contents.
    const contents = (messageHistory || [])
        .filter((msg) => msg.content && msg.content.trim() !== "")
        .map((msg) => ({
            role: msg.isResponse ? "model" : "user",
            parts: [{ text: msg.content }]
        }));

    // Add the current user message to the end of the conversation history.
    contents.push({
        role: "user",
        parts: [{ text: message }]
    });
    const reponse = await useGemini(contents, chatResponseSystemInstruction, defaultGeneralConfig);
    return reponse;
}

export const getUpdatedContent = async (message: string, response: string) => {
    const contents: Contents = [
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: response }] }
    ];

    try {
        const MAX_RETRIES = 3;
        const INITIAL_DELAY_MS = 300;

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const apiResponse = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents,
                        systemInstruction: genContentSystemInstruction,
                        generationConfig: {
                            ...defaultGeneralConfig,
                            responseMimeType: "application/json",
                        }
                    })
                });

                if (apiResponse.ok) {
                    const data = await apiResponse.json();
                    const jsonResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (jsonResponseText) {
                         try {
                            const parsed = JSON.parse(jsonResponseText);
                            return parsed;
                        } catch (err) {
                            console.error("Failed to parse Gemini output as JSON:", jsonResponseText);
                            throw new Error("Invalid JSON returned from Gemini");
                        }
                    } else {
                         throw new Error("No JSON text returned from API.");
                    }
                }

                if (apiResponse.status === 503 || apiResponse.status === 500) {
                    if (i === MAX_RETRIES - 1) {
                        const errorText = await apiResponse.text();
                        throw new Error(`Gemini API error: ${apiResponse.status} ${errorText}`);
                    }
                    const delay = INITIAL_DELAY_MS * Math.pow(2, i);
                    console.error(`Gemini API returned ${apiResponse.status}. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    const errorText = await apiResponse.text();
                    throw new Error(`Gemini API error: ${apiResponse.status} ${errorText}`);
                }
            } catch (err) {
                if (i === MAX_RETRIES - 1) {
                    throw err;
                }
                const delay = INITIAL_DELAY_MS * Math.pow(2, i);
                console.error(`Attempt ${i + 1} failed with network error. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error("Failed to get a structured response from Gemini API after all retries.");

    } catch (err) {
        console.error("Error generating structured content:", err);
        throw err;
    }
}

// Assume GEMINI_API_KEY is correctly set in your .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

export const useGemini = async (contents: Contents, systemInstruction: {parts: {text: string}[]}, generalConfig: {temperature: number, maxOutputTokens: number}) => {
    // Loop for retries with exponential backoff
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents,
                    systemInstruction,
                    generationConfig: generalConfig
                })
            });

            if (response.ok) {
                const data = await response.json();
                const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;

                return result
            }

            // Check for a retryable error (e.g., 500, 503)
            if (response.status === 503 || response.status === 500) {
                if (i === MAX_RETRIES - 1) {
                    const errorText = await response.text();
                    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
                }
                const delay = INITIAL_DELAY_MS * Math.pow(2, i);
                console.error(`Gemini API returned ${response.status}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Non-retryable error, throw it immediately
                const errorText = await response.text();
                throw new Error(`Gemini API error: ${response.status} ${errorText}`);
            }
        } catch (err) {
            // If it's a network error, log and retry
            if (i === MAX_RETRIES - 1) {
                // Re-throw if it's the last attempt
                throw err;
            }
            const delay = INITIAL_DELAY_MS * Math.pow(2, i);
            console.error(`Attempt ${i + 1} failed with network error. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // Explicitly throw an error if all retries fail
    throw new Error("Failed to get a response from Gemini API after all retries.");
}
