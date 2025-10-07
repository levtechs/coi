import { Card, PostCardPayload } from "@/lib/types";
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

/**
 * Updates an existing card in the API for a specific project.
 * @param projectId The ID of the project.
 * @param cardId The ID of the card to update.
 * @param updates The fields to update (title, details, exclude).
 * @returns A promise that resolves to the updated Card or null on failure.
 */
export async function updateCard(projectId: string, cardId: string, updates: { title?: string; details?: string[]; exclude?: boolean }): Promise<Card | null> {
    try {
        const payload = { cardId, ...updates };
        const updatedCard = await apiFetch<Card>(`/api/cards/${projectId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
        return updatedCard;
    } catch (err) {
        console.error("Error updating card:", err);
        return null;
    }
}

/**
 * Deletes a card from the API for a specific project.
 * @param projectId The ID of the project.
 * @param cardId The ID of the card to delete.
 * @returns A promise that resolves to true on success or false on failure.
 */
export async function deleteCard(projectId: string, cardId: string): Promise<boolean> {
    try {
        const payload = { cardId };
        await apiFetch(`/api/cards/${projectId}`, {
            method: "DELETE",
            body: JSON.stringify(payload),
        });
        return true;
    } catch (err) {
        console.error("Error deleting card:", err);
        return false;
    }
}
