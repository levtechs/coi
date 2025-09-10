import { apiFetch } from "./helpers";

import { Card, Quiz } from "@/lib/types";

// Creates a quiz with cards
export async function createQuiz(cards: Card[], projectId: string): Promise<string> {
    try {
        const data = await apiFetch<{ quizId: string }>(`/api/quiz`, {
            method: "POST",
            body: JSON.stringify({cards, projectId}),
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