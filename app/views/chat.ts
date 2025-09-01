import { Message } from "@/lib/types";

import { auth } from "@/lib/firebase";

/**
 * Sends a new message and the full conversation history to the API.
 * @param message The new message from the user.
 * @param messageHistory The array of previous messages in the conversation.
 * @returns A promise that resolves to the assistant's response.
 */
export async function getResponse(
    message: string,
    messageHistory: Message[],
    projectId: string
): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-user-id": user.uid,
            },
            body: JSON.stringify({
                // Pass the full messageHistory array directly.
                // The API route needs the structured objects to determine message roles.
                message,
                messageHistory,
                projectId,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chat API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data.response || "No response from API.";
    } catch (err) {
        console.error("Error fetching chat response:", err);
        throw err;
    }
}
