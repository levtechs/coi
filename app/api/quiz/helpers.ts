import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, arrayUnion } from "firebase/firestore";

import { defaultGeneralConfig, llmModel, genAI } from "../gemini/config";
import { createQuizFromCardsSystemInstruction } from "./prompts";

import { NewCard, QuizSettings } from "@/lib/types";
import { Content, GenerationConfig, ThinkingConfig, Tool, Type, Schema } from "@google/genai";
import { MyConfig, MyGenerateContentParameters } from "../gemini/types";

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

    const filteredCards = cards.filter((card) => !card.url && card.details && card.title.trim() !== "");

    const cardText = filteredCards.map((card) => `Title: ${card.title}\nDetails: ${card.details!.join('\n')}`).join('\n\n---\n\n');

    const systemInstruction = { role: "user", parts: createQuizFromCardsSystemInstruction(quizSettings).parts };

    const contents = [
        { role: "user", parts: [{ text: cardText }] }
    ];

    const allContents = [systemInstruction, ...contents];

    const model = "gemini-2.5-flash-lite";
    const config: MyConfig = {
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: buildQuizSchema(quizSettings),
        },
    };

    const params: MyGenerateContentParameters = {
        model,
        contents: allContents as Content[],
        config,
    };

    try {
        let jsonString: string;
        try {
            const result = await genAI.models.generateContent(params);
            jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (err) {
            const error = err as { status?: number };
            if (error.status === 503) {
                const streamingResp = await genAI.models.generateContentStream(params);
                let accumulated = "";
                for await (const chunk of streamingResp) {
                    const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    accumulated += partText;
                }
                jsonString = accumulated;
            } else {
                throw err;
            }
        }

        // Clean the response to extract JSON
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();

        const parsedJson = JSON.parse(jsonString);

        if (!parsedJson) {
            console.error("No JSON content found in API response.");
            return null;
        }

        // Ensure description is set
        if (!parsedJson.description) {
            parsedJson.description = "Quiz generated from cards";
        }

        // Return the structured object directly.
        return parsedJson;
    } catch (err) {
        console.error("Error calling Gemini API or parsing response:", err);
        return null;
    }
};

export const buildQuizSchema = (settings: QuizSettings = { includeMCQ: true, includeFRQ: true, quizStyle: "mixed", length: "normal" }): object => {
    const { minNumQuestions, maxNumQuestions, includeMCQ, includeFRQ } = settings;

    const allowedTypes: string[] = [];

    // Add types
    if (includeMCQ) {
        allowedTypes.push("MCQ");
    }
    if (includeFRQ) {
        allowedTypes.push("FRQ");
    }

    // Safety check: if no types enabled, throw clear error
    if (allowedTypes.length === 0) {
        throw new Error("At least one of includeMCQ or includeFRQ must be true in QuizSettings.");
    }

    const mcqContentSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                minItems: "2",
            } as Schema,
            correctOptionIndex: { type: Type.NUMBER } as Schema,
        },
        required: ["options", "correctOptionIndex"],
    } as Schema;

    const frqContentSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            gradingCriteria: { type: Type.STRING } as Schema,
            exampleAnswer: { type: Type.STRING } as Schema,
        },
        required: ["gradingCriteria", "exampleAnswer"],
    } as Schema;

    const contentSchemas: Schema[] = [];
    if (includeMCQ) contentSchemas.push(mcqContentSchema);
    if (includeFRQ) contentSchemas.push(frqContentSchema);

    const questionSchema = {
        type: Type.OBJECT,
        properties: {
            type: {
                type: Type.STRING,
                enum: allowedTypes,
            },
            question: { type: Type.STRING },
            content: {
                oneOf: contentSchemas,
            },
        },
        required: ["type", "question", "content"],
    };

    const quizSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            createdAt: { type: Type.STRING },
            description: { type: Type.STRING },
            title: { type: Type.STRING },
            questions: {
                type: Type.ARRAY,
                items: questionSchema,
                ...(minNumQuestions ? { minItems: minNumQuestions.toString() } : {}),
                ...(maxNumQuestions ? { maxItems: maxNumQuestions.toString() } : {}),
            },
        },
        required: ["description", "title", "questions"],
    };

    return quizSchema;
};
