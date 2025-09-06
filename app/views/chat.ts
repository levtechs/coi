import { Message, Card } from "@/lib/types";
import { apiFetch } from "./helpers"; // adjust path if needed

/**
 * Sends a new message and the full conversation history to the API.
 * @param message The new message from the user.
 * @param messageHistory The array of previous messages in the conversation.
 * @returns A promise that resolves to the assistant's response.
 */
export async function getResponse(
    message: string,
    messageHistory: Message[],
    projectId: string,
): Promise<{response: string, newContent: JSON | null, allCards: Card[] | null}> {
    try {
        const data = await apiFetch<{ response: string, newContent?: JSON, allCards?: Card[]}>("/api/chat", {
            method: "POST",
            body: JSON.stringify({
                message,
                messageHistory,
                projectId,
            }),
        });

        // Corrected the return statement to create a valid object with key-value pairs
        return {
            response: data.response,
            newContent: data.newContent || null,
            allCards: data.allCards || null
        };
    } catch (err) {
        console.error("Error fetching chat response:", err);
        throw err;
    }
}


/**
 * Get full chat history for the current user in a given project.
 * @param projectId The project ID to fetch chat history for.
 * @returns Promise resolving to array of messages.
 */
export async function getChatHistory(
    projectId: string
): Promise<Message[]> {
    try {
        const data = await apiFetch<{ messages: Message[] }>(
            `/api/chat?projectId=${encodeURIComponent(projectId)}`,
            {
                method: "GET",
            }
        );

        return data.messages || [];
    } catch (err) {
        console.error("Error fetching chat history:", err);
        return [];
    }
}