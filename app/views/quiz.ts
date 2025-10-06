import { apiFetch } from "./helpers";

import { Card, QuizSettings, Quiz } from "@/lib/types";

// Creates a quiz with cards
export async function createQuiz(cards: Card[], quizSettings: QuizSettings, projectId: string): Promise<string> {
    try {
        const data = await apiFetch<{ quizId: string }>(`/api/quiz`, {
            method: "POST",
            body: JSON.stringify({cards, quizSettings, projectId}),
        });
        return data.quizId;
    } catch (err) {
        console.error("Error creating quiz:", err);
        throw Error("Error creating quiz")
    }
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
    try {
        const data = await apiFetch<Quiz>(`/api/quiz/${quizId}`, {
            method: "GET",
        });
        if (data) data.id = quizId
        return data;
    }
    catch (err) {
        console.error("Error fetching quiz:", err);
        return null;
    }
}

export async function gradeQuiz(quizId: string, answers: (number | string)[]): Promise<{results: {isCorrect: boolean, score: number, correctAnswer: string, feedback?: string}[], totalScore: number, maxScore: number}> {
    try {
        const data = await apiFetch<{results: {isCorrect: boolean, score: number, correctAnswer: string, feedback?: string}[], totalScore: number, maxScore: number}>(`/api/quiz/${quizId}`, {
            method: "PUT",
            body: JSON.stringify({answers}),
        });
        return data;
    } catch (err) {
        console.error("Error grading quiz:", err);
        throw Error("Error grading quiz");
    }
}
