import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

import { Message, Card, ContentHierarchy} from "@/lib/types"; // { content: string; isResponse: boolean }
import { Content, Contents } from "./types";

import { 
    llmModel,
    defaultGeneralConfig, 
    limitedGeneralConfig,
} from "../gemini/config";
import {
    chatResponseSystemInstruction, 
    generateCardsSystemInstruction,
    generateHierarchySystemInstruction,
    //  === \/ below is depricated \/ 
    firstChatResponseSystemInstruction,
    genContentSystemInstruction, 
    updateContentSystemInstruction, 
} from "./config"
import { callGeminiApi } from "../gemini/helpers";
import { GenerateContentRequest } from "@google/generative-ai";
import { writeCardsToDb } from "../cards/helpers"

/**
 * Recursively builds a JSON representation of a content hierarchy combined with its referenced cards.
 *
 * @param cards - The full list of available cards.
 * @param hierarchy - The content hierarchy structure.
 * @returns A JSON string that combines the hierarchy and card details, suitable for providing as context to an LLM.
 */
export const getStringFromHierarchyAndCards = async (
    cards: Card[],
    hierarchy: ContentHierarchy
): Promise<string> => {
    /**
     * Recursively serialize a node or hierarchy.
     */
    const serializeHierarchy = (h: ContentHierarchy): object => {
        return {
            title: h.title,
            children: h.children.map((child) => {
                switch (child.type) {
                    case "text":
                        return { type: "text", text: child.text };

                    case "card": {
                        const card = cards.find((c) => c.id === child.cardId);

                        if (card) {
                            return {
                                type: "card",
                                id: card.id,
                                title: card.title,
                                details: card.details,
                            };
                        } else {
                            return {
                                type: "card",
                                id: child.cardId,
                                missing: true,
                            };
                        }
                    }

                    case "subcontent":
                        return {
                            type: "subcontent",
                            content: serializeHierarchy(child.content),
                        };
                }
            }),
        };
    };

    const result = serializeHierarchy(hierarchy);
    return JSON.stringify(result, null, 2);
};

/**
 * Fetches the previous content hierarchy for a project from Firestore.
 *
 * @param projectId - The ID of the project.
 * @returns The ContentHierarchy object if it exists, otherwise null.
 */
export const getPreviousHierarchy = async (
    projectId: string,
): Promise<ContentHierarchy | null> => {
    try {
        const projectDocRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectDocRef);

        if (!projectSnap.exists()) {
            console.warn(`Project with ID ${projectId} does not exist.`);
            return null;
        }

        const data = projectSnap.data();

        if (!data.hierarchy) {
            console.warn(`Project ${projectId} has no hierarchy field.`);
            return null;
        }

        // If hierarchy is stored as a string (JSON), parse it
        let hierarchy: ContentHierarchy;
        if (typeof data.hierarchy === "string") {
            hierarchy = JSON.parse(data.hierarchy) as ContentHierarchy;
        } else {
            hierarchy = data.hierarchy as ContentHierarchy;
        }

        return hierarchy;
    } catch (err) {
        console.error("Error fetching previous content hierarchy:", err);
        return null;
    }
};

/**
 * Writes a content hierarchy to a Firestore project document.
 *
 * @param projectId - The ID of the project to update.
 * @param hierarchy - The ContentHierarchy object to store.
 */
export const writeHierarchy = async (
    projectId: string,
    hierarchy: ContentHierarchy
): Promise<void> => {
    try {
        const projectDocRef = doc(db, "projects", projectId);

        // Store hierarchy as an object (Firestore supports nested objects)
        await updateDoc(projectDocRef, {
            hierarchy: hierarchy
        });

        console.log(`Hierarchy successfully written for project ${projectId}`);
    } catch (err) {
        console.error(`Error writing hierarchy for project ${projectId}:`, err);
        throw err;
    }
};

/**
 * Generates new cards using Gemini, writes them to Firestore, and returns the full list of cards.
 *
 * @param projectId - The ID of the project.
 * @param oldCards - Existing cards, if any (can be null).
 * @returns Full list of Card objects including new ones.
 */
export const generateAndWriteNewCards = async (
    projectId: string,
    oldCards: Card[] | null,
    userMessage: string,
    responseMessage: string
): Promise<Card[]> => {

    const attatchments = {oldCards, userMessage, responseMessage}
    const parts = [{ text: JSON.stringify(attatchments)}]

    const requestBody: GenerateContentRequest = {
        contents: [{
            role: "user",
            parts,
        }],
        systemInstruction: {
            role: "system",
            parts: generateCardsSystemInstruction.parts,
        },
        generationConfig: {
            responseMimeType: "application/json",
        },
    };

    // Call Gemini
    const result = await llmModel.generateContent(requestBody);
    const jsonString = result?.response.candidates?.[0]?.content?.parts?.[0]?.text;

    let newCardsRaw: Omit<Card, "id">[];
    try {
        newCardsRaw = JSON.parse(jsonString!);
    } catch (err) {
        console.error("Failed to parse new cards from Gemini:", err, jsonString);
        return oldCards || [];
    }

    // Write new cards to DB
    const newCards = await writeCardsToDb(projectId, newCardsRaw);

    // Return newCards
    return newCards;
};

/**
 * Generates a new content hierarchy from cards using Gemini.
 *
 * @param projectId - The ID of the project.
 * @param oldHierarchy - Existing content hierarchy, if any (can be null).
 * @returns The new ContentHierarchy object.
 */
export const generateNewHierarchyFromCards = async (
    oldHierarchy: ContentHierarchy | null,
    previousCards: Card[],
    newCards: Card[],
): Promise<ContentHierarchy> => {

    const attatchments = {oldHierarchy, previousCards, newCards}
    const parts = [{ text: JSON.stringify(attatchments)}]

    const requestBody: GenerateContentRequest = {
        contents: [{ role: "user", parts}],
        systemInstruction: {
            role: "system",
            parts: generateHierarchySystemInstruction.parts,
        },
        generationConfig: {
            responseMimeType: "application/json",
        }
    };

    const result = await llmModel.generateContent(requestBody);
    const jsonString = result?.response.candidates?.[0]?.content?.parts?.[0]?.text;

    let hierarchy: ContentHierarchy;
    try {
        hierarchy = JSON.parse(jsonString!);
    } catch (err) {
        console.error("Failed to parse hierarchy from Gemini:", err, jsonString);
        throw err;
    }

    return hierarchy;
};

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


/*
 * ========================================================
 * ========================================================
 * ============ EVERYTHING BELOW IS DEPRICATED ============
 * ========================================================
 * ========================================================
 */


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