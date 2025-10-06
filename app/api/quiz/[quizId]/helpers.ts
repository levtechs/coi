import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Quiz, QuizQuestion } from "@/lib/types";
import { defaultGeneralConfig } from "../../gemini/config";
import { callGeminiApi } from "../../gemini/helpers";
import { gradeFRQsSystemInstruction } from "../prompts";

export async function fetchQuiz(quizId: string) {
    const quizDocRef = doc(db, "quizzes", quizId);
    const quizDocSnap = await getDoc(quizDocRef);

    if (!quizDocSnap.exists()) {
        throw new Error("Quiz not found");
    }

    const quizData = quizDocSnap.data();
    return { id: quizDocSnap.id, ...quizData } as Quiz;
}

/**
 *
 * @param frqList - list of FRQ questions with responses
 * @returns array of {feedback, score}
 */
export const gradeFRQs = async (
    frqList: {question: QuizQuestion, response: string, index: number}[]
): Promise<{feedback: string, score: number}[]> => {
    if (frqList.length === 0) return [];

    const combinedText = frqList.map((f, i) => `Question ${i + 1}: ${f.question.question}\nResponse: ${f.response}\nGrading Criteria: ${(f.question.content as {gradingCriteria: string, exampleAnswer: string}).gradingCriteria}\nExample Answer: ${(f.question.content as {gradingCriteria: string, exampleAnswer: string}).exampleAnswer}`).join('\n\n---\n\n');

    const contents = [{
        role: "user",
        parts: [{ text: combinedText }]
    }];

    const generationConfig = {
        ...defaultGeneralConfig,
        responseMimeType: "application/json",
        responseSchema: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    feedback: { type: "string" },
                    score: { type: "number", minimum: 0, maximum: 3 }
                },
                required: ["feedback", "score"]
            },
            minItems: frqList.length,
            maxItems: frqList.length
        }
    };

    const body = {
        contents,
        systemInstruction: gradeFRQsSystemInstruction(),
        generationConfig
    };

    try {
        const response = await callGeminiApi(body);
        const jsonString = response?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonString) {
            console.error("No JSON content found in API response for FRQ grading.");
            return frqList.map(() => ({ feedback: "Error grading response.", score: 0 }));
        }
        const results = JSON.parse(jsonString);
        return results;
    } catch (err) {
        console.error("Error calling Gemini API for FRQ grading:", err);
        return frqList.map(() => ({ feedback: "Error grading response.", score: 0 }));
    }
}
