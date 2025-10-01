import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";

import { defaultGeneralConfig } from "../gemini/config";
import { callGeminiApi } from "../gemini/helpers";
import { createQuizFromCardsSystemInstruction } from "./prompts";

import { Card } from "@/lib/types";

/**
 * Writes a new quiz entry to the project's quizes collection.
 * @param quiz The quiz JSON object to store.
 * @returns The ID of the newly created quiz document.
 */
export const writeQuizToDb = async (quiz: object, projectId: string): Promise<string> => {
    if (!quiz) throw new Error("Missing quiz");

    try {
        // 1. Write quiz to quizzes collection
        const quizzesColRef = collection(db, "quizzes");
        const docRef = await addDoc(quizzesColRef, {
            ...quiz,
            createdAt: new Date().toISOString(),
        });

        console.log("New quiz written successfully with ID:", docRef.id);

        // 2. Add quizId to the project document's quizIds array
        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, {
            quizIds: arrayUnion(docRef.id),
        });

        console.log(`Quiz ID ${docRef.id} added to project ${projectId}`);
        return docRef.id;
    } catch (err) {
        console.error("Error writing quiz to DB or updating project:", err);
        throw err;
    }
};

/**
 * Calls the Gemini API to get a structured JSON response.
 * @param cards The cards to base the quiz on.
 * @returns A promise that resolves to a JSON with the quiz content.
 */
export const createQuizFromCards = async (cards: Card[]): Promise<JSON | null> => {
    if (!cards || cards.length === 0) {
        throw new Error("Must have at least one card to create a quiz.");
    }

    const contents = (cards)
        .filter((card) => card.details && card.title.trim() !== "")
        .map((card) => ({
            role: "user",
            parts: [{ text: (`Title: ${card.title}, Details: ${card.details}`) }]
        }));

    // Define the schema for the expected JSON response.
    const generationConfig = {
        ...defaultGeneralConfig,
        responseMimeType: "application/json",
        responseSchema: {
            type: "OBJECT",
            properties: {
                "title": { "type": "STRING" },
                "description": { "type": "string" },
                "questions": { "type": "ARRAY", "items": {
                    type: "OBJECT",
                    properties: {
                        "question": { "type": "STRING" },
                        "options": { "type": "ARRAY", "items": { "type": "STRING" } },
                        "correctOptionIndex": { "type": "NUMBER" }
                    },
                    required: ["question", "options", "correctOptionIndex"]
                }}
            },
        },
    };

    const body = {
        contents,
        systemInstruction: createQuizFromCardsSystemInstruction,
        generationConfig: generationConfig,
    };

    try {
        const response = await callGeminiApi(body);
        const jsonString = JSON.parse(response?.candidates?.[0]?.content?.parts?.[0]?.text);

        if (!jsonString) {
            console.error("No JSON content found in API response.");
            return null;
        }

        // Return the structured object directly.
        return jsonString;
    } catch (err) {
        console.error("Error calling Gemini API or parsing response:", err);
        return null;
    }
};
