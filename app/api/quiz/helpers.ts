import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

import { defaultGeneralConfig, llmModel, genAI } from "../gemini/config";
import { createQuizFromCardsSystemInstruction } from "./prompts";

import { NewCard } from "@/lib/types/cards";
import { Quiz, QuizAttempt, QuizAttemptSummary, QuizSettings } from "@/lib/types/quiz";
import { Content, GenerationConfig, ThinkingConfig, Tool, Type, Schema } from "@google/genai";
import { MyConfig, MyGenerateContentParameters } from "../gemini/types";

/**
 * Writes a new quiz entry to the project's quizes collection.
 * @param quiz The quiz JSON object to store.
 * @returns The ID of the newly created quiz document.
 */
export const writeQuizToDb = async (quiz: object, projectId?: string, metadata?: Partial<Quiz>): Promise<string> => {
    if (!quiz) throw new Error("Missing quiz");

    try {
        // 1. Write quiz to quizzes collection
        const quizzesColRef = adminDb.collection("quizzes");
        const docRef = await quizzesColRef.add({
            ...quiz,
            ...(metadata || {}),
            createdAt: new Date().toISOString(),
        });

        // 2. Add quizId to the project document's quizIds array if projectId provided
        if (projectId) {
            const projectRef = adminDb.collection("projects").doc(projectId);
            await projectRef.update({
                quizIds: admin.firestore.FieldValue.arrayUnion(docRef.id),
            });
        }

        return docRef.id;
    } catch (err) {
        console.error("Error writing quiz to DB or updating project:", err);
        throw err;
    }
};

export async function updateQuizMetadata(quizId: string, metadata: Partial<Quiz>): Promise<void> {
    if (!quizId) return;

    await adminDb.collection("quizzes").doc(quizId).set(metadata, { merge: true });
}

export async function writeQuizAttempt(
    quiz: Quiz,
    uid: string,
    answers: (number | string)[],
    results: { isCorrect: boolean; score: number; correctAnswer: string; feedback?: string }[],
    totalScore: number,
    maxScore: number,
    elapsedMs?: number,
): Promise<QuizAttempt> {
    if (!quiz.id) {
        throw new Error("Quiz id is required to store attempts");
    }

    const attemptsRef = adminDb.collection("quizzes").doc(quiz.id).collection("attempts");
    const existingAttemptsSnap = await attemptsRef.where("userId", "==", uid).get();
    const attemptNumber = existingAttemptsSnap.size + 1;
    const submittedAt = new Date().toISOString();
    const percentScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

    const payload: Omit<QuizAttempt, "id"> = {
        quizId: quiz.id,
        userId: uid,
        answers,
        results,
        totalScore,
        maxScore,
        percentScore,
        submittedAt,
        attemptNumber,
        ...(elapsedMs !== undefined ? { elapsedMs } : {}),
        ...(quiz.courseId ? { courseId: quiz.courseId } : {}),
        ...(quiz.lessonId ? { lessonId: quiz.lessonId } : {}),
        ...(quiz.projectId ? { projectId: quiz.projectId } : {}),
    };

    const attemptRef = await attemptsRef.add(payload);
    const allAttemptsSnap = await attemptsRef.get();
    const allAttempts = allAttemptsSnap.docs.map((doc) => doc.data() as Omit<QuizAttempt, "id">);
    const highestScore = allAttempts.reduce((best, attempt) => Math.max(best, attempt.percentScore || 0), 0);
    const averageScore = allAttempts.length > 0
        ? Math.round((allAttempts.reduce((sum, attempt) => sum + (attempt.percentScore || 0), 0) / allAttempts.length) * 10) / 10
        : 0;
    const completedByCount = new Set(allAttempts.map((attempt) => attempt.userId)).size;

    await updateQuizMetadata(quiz.id, {
        attemptCount: allAttempts.length,
        completedByCount,
        highestScore,
        averageScore,
    });

    return {
        id: attemptRef.id,
        ...payload,
    };
}

export function toQuizAttemptSummary(attempt: QuizAttempt): QuizAttemptSummary {
    return {
        id: attempt.id,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentScore: attempt.percentScore,
        submittedAt: attempt.submittedAt,
        attemptNumber: attempt.attemptNumber,
    };
}

/**
 * Calls the Gemini API to get a structured JSON response.
 * @param cards The cards to base the quiz on.
 * @returns A promise that resolves to a JSON with the quiz content.
 */
export const createQuizFromCards = async (cards: NewCard[], quizSettings: QuizSettings): Promise<JSON | null> => {
    if (!cards || cards.length === 0) {
        throw new Error("Must have at least one card to create a quiz.");
    }

    const filteredCards = cards.filter((card) => 
        !card.url && 
        card.details && 
        card.title.trim() !== "" &&
        !card.labels?.includes("exclude from quiz") &&
        !(card.exclude && !card.labels?.includes("exclude from hierarchy")) // Keep backward compatibility
    );

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
