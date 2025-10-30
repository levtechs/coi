import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Quiz, QuizQuestion } from "@/lib/types";
import { genAI } from "../../gemini/config";
import { gradeFRQsSystemInstruction } from "../prompts";
import { Content, GenerationConfig, ThinkingConfig, Tool, Type } from "@google/genai";
import { MyConfig, MyGenerateContentParameters } from "../../gemini/types";

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

    const systemInstructionContent = { role: "user", parts: gradeFRQsSystemInstruction().parts };
    const contents = [{
        role: "user",
        parts: [{ text: combinedText }]
    }];

    const allContents = [systemInstructionContent, ...contents];

    const model = "gemini-2.5-flash-lite";
    const config: MyConfig = {
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        feedback: { type: Type.STRING },
                        score: { type: Type.NUMBER, minimum: 0, maximum: 3 }
                    },
                    required: ["feedback", "score"]
                },
                minItems: frqList.length.toString(),
                maxItems: frqList.length.toString()
            },
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

        if (!jsonString) {
            console.error("No JSON content found in API response for FRQ grading.");
            return frqList.map(() => ({ feedback: "Error grading response.", score: 0 }));
        }
        // Clean the response to extract JSON
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
        const results = JSON.parse(jsonString);
        return results;
    } catch (err) {
        console.error("Error calling Gemini API for FRQ grading:", err);
        return frqList.map(() => ({ feedback: "Error grading response.", score: 0 }));
    }
}
