import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";

import { defaultGeneralConfig, llmModel } from "../gemini/config";
import { createQuizFromCardsSystemInstruction } from "./prompts";

import { NewCard, QuizSettings } from "@/lib/types";
import { SchemaType, ObjectSchema } from "@google/generative-ai";

/**
 * Writes a new quiz entry to the project's quizes collection.
 * @param quiz The quiz JSON object to store.
 * @returns The ID of the newly created quiz document.
 */
export const writeQuizToDb = async (quiz: object, projectId?: string): Promise<string> => {
    if (!quiz) throw new Error("Missing quiz");

    try {
        // 1. Write quiz to quizzes collection
        const quizzesColRef = collection(db, "quizzes");
        const docRef = await addDoc(quizzesColRef, {
            ...quiz,
            createdAt: new Date().toISOString(),
        });

        // 2. Add quizId to the project document's quizIds array if projectId provided
        if (projectId) {
            const projectRef = doc(db, "projects", projectId);
            await updateDoc(projectRef, {
                quizIds: arrayUnion(docRef.id),
            });
        }

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
export const createQuizFromCards = async (cards: NewCard[], quizSettings: QuizSettings): Promise<JSON | null> => {
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
        responseSchema: buildQuizSchema(quizSettings),
    };

    const body = {
        contents,
        systemInstruction: { role: "system", parts: createQuizFromCardsSystemInstruction(quizSettings).parts },
        generationConfig: generationConfig,
    };

    try {
        let jsonString: string;
        try {
            const result = await llmModel.generateContent(body);
            jsonString = result?.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            const error = err as { status?: number };
            if (error.status === 503) {
                const streamingResp = await llmModel.generateContentStream(body);
                let accumulated = "";
                for await (const chunk of streamingResp.stream) {
                    const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    accumulated += partText;
                }
                jsonString = accumulated;
            } else {
                throw err;
            }
        }

        const parsedJson = JSON.parse(jsonString);

        if (!parsedJson) {
            console.error("No JSON content found in API response.");
            return null;
        }

        // Return the structured object directly.
        return parsedJson;
    } catch (err) {
        console.error("Error calling Gemini API or parsing response:", err);
        return null;
    }
};

export const buildQuizSchema = (settings: QuizSettings = { includeMCQ: true, includeFRQ: true }): ObjectSchema => {
    const { minNumQuestions, maxNumQuestions, includeMCQ, includeFRQ } = settings;

    const allowedTypes: string[] = [];
    const contentSchemas: object[] = [];

    // Add MCQ branch if enabled
    if (includeMCQ) {
        allowedTypes.push("MCQ");
        contentSchemas.push({
            type: SchemaType.OBJECT,
            properties: {
                options: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    minItems: 2,
                },
                correctOptionIndex: { type: SchemaType.NUMBER },
            },
            required: ["options", "correctOptionIndex"],
        });
    }

    // Add FRQ branch if enabled
    if (includeFRQ) {
        allowedTypes.push("FRQ");
        contentSchemas.push({
            type: SchemaType.OBJECT,
            properties: {
                gradingCriteria: { type: SchemaType.STRING },
                exampleAnswer: { type: SchemaType.STRING },
            },
            required: ["gradingCriteria", "exampleAnswer"],
        });
    }

    // Safety check: if no types enabled, throw clear error
    if (allowedTypes.length === 0) {
        throw new Error("At least one of includeMCQ or includeFRQ must be true in QuizSettings.");
    }

    const questionSchema = {
        type: SchemaType.OBJECT,
        properties: {
            type: {
                type: SchemaType.STRING,
                enum: allowedTypes,
            },
            question: { type: SchemaType.STRING },
            content: {
                oneOf: contentSchemas,
            },
        },
        required: ["type", "question", "content"],
    };

    const quizSchema = {
        type: SchemaType.OBJECT,
        properties: {
            id: { type: SchemaType.STRING },
            createdAt: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            title: { type: SchemaType.STRING },
            questions: {
                type: SchemaType.ARRAY,
                items: questionSchema,
                ...(minNumQuestions ? { minItems: minNumQuestions } : {}),
                ...(maxNumQuestions ? { maxItems: maxNumQuestions } : {}),
            },
        },
        required: ["description", "title", "questions"],
    };

    return quizSchema as ObjectSchema;
};
