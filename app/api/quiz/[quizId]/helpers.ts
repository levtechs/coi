import { adminDb } from "@/lib/firebaseAdmin";
import { Quiz, QuizAttempt, QuizAttemptSummary, QuizQuestion } from "@/lib/types/quiz";
import { genAI } from "../../gemini/config";
import { gradeFRQsSystemInstruction } from "../prompts";
import { Content, Type } from "@google/genai";
import { MyConfig, MyGenerateContentParameters } from "../../gemini/types";

export async function fetchQuiz(quizId: string) {
    const quizDocRef = adminDb.collection("quizzes").doc(quizId);
    const quizDocSnap = await quizDocRef.get();

    if (!quizDocSnap.exists) {
        throw new Error("Quiz not found");
    }

    const quizData = quizDocSnap.data();
    return { id: quizDocSnap.id, ...quizData } as Quiz;
}

export async function fetchQuizAttemptsForUser(quizId: string, uid: string): Promise<QuizAttempt[]> {
    const attemptsSnap = await adminDb
        .collection("quizzes")
        .doc(quizId)
        .collection("attempts")
        .where("userId", "==", uid)
        .get();

    return attemptsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as QuizAttempt[];
}

export function summarizeAttempts(attempts: QuizAttempt[]): { latestAttempt: QuizAttemptSummary | null; bestAttempt: QuizAttemptSummary | null } {
    if (attempts.length === 0) {
        return { latestAttempt: null, bestAttempt: null };
    }

    const sortedByTime = [...attempts].sort((a, b) => new Date(String(b.submittedAt)).getTime() - new Date(String(a.submittedAt)).getTime());
    const sortedByScore = [...attempts].sort((a, b) => b.percentScore - a.percentScore || new Date(String(b.submittedAt)).getTime() - new Date(String(a.submittedAt)).getTime());

    const toSummary = (attempt: QuizAttempt): QuizAttemptSummary => ({
        id: attempt.id,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentScore: attempt.percentScore,
        submittedAt: attempt.submittedAt,
        attemptNumber: attempt.attemptNumber,
    });

    return {
        latestAttempt: toSummary(sortedByTime[0]),
        bestAttempt: toSummary(sortedByScore[0]),
    };
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
