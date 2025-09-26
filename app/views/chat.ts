//app/views/chat.ts

import { auth } from "@/lib/firebase";
import { apiFetch } from "./helpers"; // adjust path if needed

import { Message, Card, StreamPhase, ContentHierarchy, ChatAttachment } from "@/lib/types";

/**
 * Streams a chat response from the API.
 * @param message The new user message.
 * @param messageHistory The recent conversation history.
 * @param projectId The project ID for context.
 * @param onToken Callback for each streamed token of the assistant's message.
 * @returns Resolves with the final object (response + optional newContent/allCards).
 */
export async function streamChat(
    message: string,
    messageHistory: Message[],
    attachments: null | ChatAttachment[],
    projectId: string,
    setPhase: (phase: null | StreamPhase) => void,
    setFinalResponseMessage: (value: string) => void,
    setNewCards: (newCards: Card[]) => void,
    onToken: (token: string) => void,
): Promise<{ responseMessage: string; newHierarchy: ContentHierarchy | null; allCards: Card[] | null }> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const idToken = await user.getIdToken();
    const res = await fetch("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({ message, messageHistory, attachments, projectId }),
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
        },
    });

    if (!res.body) throw new Error("No response body from stream");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (!line) continue;

            // Try to parse JSON control message
            try {
                const obj = JSON.parse(line);

                if (obj.type === "final") {
                    return {
                        responseMessage: obj.responseMessage,
                        newHierarchy: obj.newHierarchy ?? null,
                        allCards: obj.allCards ?? null,
                    };
                }

                if (obj.type === "update") {
                    if (obj.responseMessage) setFinalResponseMessage(obj.responseMessage);
                    if (obj.newCards) setNewCards(JSON.parse(obj.newCards) as Card[]); 
                    continue;
                }

                if (obj.phase) {
                    setPhase(obj.phase);
                    continue;
                }

                // If it was valid JSON but doesn’t match above, ignore or log
                continue;
            } catch {
                // Not JSON → treat as streamed text token
                onToken(line);
            }
        }
    }

    throw new Error("No final response received from stream");
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
        console.log("fetching messages")
        console.log(projectId)
        const data = await apiFetch<{ messages: Message[] }>(
            `/api/chat?projectId=${encodeURIComponent(projectId)}`,
            {
                method: "GET",
            }
        );
        console.log("message history: " + data.messages)
        return data.messages || [];
    } catch (err) {
        console.error("Error fetching chat history:", err);
        return [];
    }
}


/*
 * ========================================================
 * ========================================================
 * ============ EVERYTHING BELOW IS DEPRICATED ============
 * ========================================================
 * ========================================================
 */


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