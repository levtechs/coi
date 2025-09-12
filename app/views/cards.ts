import { Card, PostCardPayload} from "@/lib/types";
import { apiFetch } from "./helpers";

/**
 * Fetches all cards for a specific project from the API.
 * @param projectId The ID of the project to fetch cards for.
 * @returns A promise that resolves to an array of Card objects.
 */
export async function getCards(projectId: string): Promise<Card[]> {
    try {
        const cards = await apiFetch<Card[]>(`/api/cards/${projectId}`);
        return cards;
    } catch (err) {
        console.error("Error fetching cards:", err);
        // Return an empty array on failure to prevent app crashes
        return [];
    }
}

/**
 * Posts a new card to the API for a specific project.
 * @param projectId The ID of the project.
 * @param cardData The card details (title, details, exclude).
 * @returns A promise that resolves to the newly created Card (with ID).
 */
export async function postCard(projectId: string, cardData: PostCardPayload): Promise<Card | null> {
    try {
        const newCard = await apiFetch<Card>(`/api/cards/${projectId}`, {
            method: "POST",
            body: JSON.stringify(cardData),
        });
        return newCard;
    } catch (err) {
        console.error("Error posting new card:", err);
        return null;
    }
}