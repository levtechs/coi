import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Message } from "@/lib/types"; // { content: string; isResponse: boolean }
import { GEMINI_API_URL, chatResponseSystemInstruction, genContentSystemInstruction, updateContentSystemInstruction, defaultGeneralConfig, INITIAL_DELAY_MS, MAX_RETRIES} from "./config";
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
        const contentHistoryColRef = collection(db, "projects", projectId, "content");
        await addDoc(contentHistoryColRef, {
            content: newContent,
            createdAt: serverTimestamp()
        });

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

// Assume GEMINI_API_KEY is correctly set in your .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

/**
 * A reusable helper function to call the Gemini API with retry logic.
 * @param body The request body to send to the Gemini API.
 * @returns The raw API response data.
 */
const callGeminiApi = async (body: any) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                return await response.json();
            }

            if (response.status === 503 || response.status === 500) {
                if (i === MAX_RETRIES - 1) {
                    const errorText = await response.text();
                    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
                }
                const delay = INITIAL_DELAY_MS * Math.pow(2, i);
                console.error(`Gemini API returned ${response.status}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                const errorText = await response.text();
                throw new Error(`Gemini API error: ${response.status} ${errorText}`);
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
    throw new Error("Failed to get a response from Gemini API after all retries.");
};

export const getChatResponse = async (message: string, messageHistory: Message[]) => {
    if (!message || message.trim() === "") {
        throw new Error("Message is required.");
    }

    const contents = (messageHistory || [])
        .filter((msg) => msg.content && msg.content.trim() !== "")
        .map((msg) => ({
            role: msg.isResponse ? "model" : "user",
            parts: [{ text: msg.content }]
        }));

    contents.push({
        role: "user",
        parts: [{ text: message }]
    });

    const body = {
        contents,
        systemInstruction: chatResponseSystemInstruction,
        generationConfig: defaultGeneralConfig,
    };

    const response = await callGeminiApi(body);
    const result = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    return result;
};

export const getPreviousContent = async (projectId: string): Promise<string | null> => {
    try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.content || null;
        } else {
            console.log("No previous content found for this project.");
            return null;
        }
    } catch (err) {
        console.error("Error getting previous content:", err);
        throw err;
    }
};

export const getUpdatedContent = async (projectId: string, message: string, response: string) => {
    const previousContent = await getPreviousContent(projectId);

    let body: Object = {}
    if (previousContent) {
        // We add the previous content to the history to give the model full context.
        const contents: Contents = [
            { role: "user", parts: [{ text: (JSON.stringify(previousContent)) }] },
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: [{ text: response }] }
        ];

        body = {
            contents,
            systemInstruction: updateContentSystemInstruction,
            generationConfig: {
                ...defaultGeneralConfig,
                responseMimeType: "application/json",
            },
        };
    }
    else {
        const contents: Contents = [
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: [{ text: response }] }
        ];

        body = {
            contents,
            systemInstruction: genContentSystemInstruction,
            generationConfig: {
                ...defaultGeneralConfig,
                responseMimeType: "application/json",
            },
        };
    }

    const apiResponse = await callGeminiApi(body);
    const jsonResponseText = apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonResponseText) {
        throw new Error("No JSON text returned from API.");
    }

    try {
        const parsed = JSON.parse(jsonResponseText);
        return parsed;
    } catch {
        console.error("Failed to parse Gemini output as JSON:", jsonResponseText);
        throw new Error("Invalid JSON returned from Gemini");
    }
};