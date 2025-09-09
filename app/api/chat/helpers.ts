import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

import { Message } from "@/lib/types"; // { content: string; isResponse: boolean }
import { Contents } from "./types";

import { 
    defaultGeneralConfig, 
    limitedGeneralConfig,
    model,
} from "../gemini/config";
import {
    chatResponseSystemInstruction, 
    firstChatResponseSystemInstruction, 
    genContentSystemInstruction, 
    updateContentSystemInstruction, 
} from "./config"
import { callGeminiApi } from "../gemini/helpers";


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
    newContent: JSON,
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

/**
 * Calls the Gemini API to get a structured JSON response.
 * @param message The user's current message.
 * @param messageHistory The history of the conversation.
 * @returns A promise that resolves to an object with a response message and a boolean indicating new information.
 */
export const getChatResponse = async (message: string, messageHistory: Message[], prevContent: string | null) => {
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

    if (prevContent) {
        contents.push({
            role: "user",
            parts: [{text: `EXISTING NOTES: ${JSON.stringify(prevContent)}`}]
        })
    }

    // Define the schema for the expected JSON response.
    const generationConfig = {
        ...limitedGeneralConfig,
        responseMimeType: "application/json",
        responseSchema: {
            type: "OBJECT",
            properties: {
                "responseMessage": { "type": "STRING" },
                "hasNewInfo": { "type": "BOOLEAN" }
            },
            propertyOrdering: ["responseMessage", "hasNewInfo"]
        },
    };
    const body = {
        contents,
        systemInstruction: (prevContent ? chatResponseSystemInstruction : firstChatResponseSystemInstruction),
        generationConfig: generationConfig,
    };

    try {
        const response = await callGeminiApi(body);
        const jsonString = JSON.parse(response?.candidates?.[0]?.content?.parts?.[0]?.text);

        if (!jsonString) {
            console.error("No JSON content found in API response.");
            return null;
        }

        const parsedResponse = jsonString;

        // Return the structured object directly.
        return {
            responseMessage: parsedResponse.responseMessage,
            hasNewInfo: parsedResponse.hasNewInfo,
        };
    } catch (err) {
        console.error("Error calling Gemini API or parsing response:", err);
        return null;
    }
};

export const getUpdatedContent = async (previousContent: string | null, message: string, response: string): Promise<JSON> => {
    let body: object = {}
    if (previousContent) {
        // We add the previous content to the history to give the model full context.
        const contents: Contents = [
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: [{ text: response }] }
        ];

        body = {
            contents,
            systemInstruction: updateContentSystemInstruction(JSON.stringify(previousContent)),
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
    if (!apiResponse) {
        throw new Error("No response from Gemini API");
    }
    try {
        const jsonResponseText = JSON.parse(apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text);
        return jsonResponseText;
    }
    catch {
        console.error("Failed to parse Gemini output as JSON:", apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text);
        throw new Error("Invalid JSON returned from Gemini");
    }
};