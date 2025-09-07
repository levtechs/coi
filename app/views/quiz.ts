import { Card } from "@/lib/types";
import { apiFetch } from "./helpers";

// Creates a quiz with cards
export async function createQuiz(cards: Card[]): Promise<string> {
    try {
        const data = await apiFetch<{ quizId: string }>(`/api/quiz`, {
            method: "POST",
            body: JSON.stringify(cards),
        });
        return data.quizId;
    } catch (err) {
        console.error("Error creating quiz:", err);
        throw Error("Error creating quiz")
    }
}
