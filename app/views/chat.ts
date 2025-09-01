import { Message } from "@/lib/types";

/**
 * Sends a new message and the full conversation history to the API.
 * @param message The new message from the user.
 * @param messageHistory The array of previous messages in the conversation.
 * @returns A promise that resolves to the assistant's response.
 */
export async function getResponse(
    message: string,
    messageHistory: Message[]
): Promise<string> {
    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // Pass the full messageHistory array directly.
                // The API route needs the structured objects to determine message roles.
                message,
                messageHistory
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
