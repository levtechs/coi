//app/views/chat.ts

import { auth } from "@/lib/firebase";
import { apiFetch } from "./helpers"; // adjust path if needed

import { Message, Card, StreamPhase, ContentHierarchy, ChatAttachment, ChatPreferences } from "@/lib/types";

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
    preferences: ChatPreferences,
    setPhase: (phase: null | StreamPhase) => void,
    setFinalResponseMessage: (message: Message) => void,
    setNewCards: (newCards: Card[]) => void,
    setFollowUpQuestions: (questions: string[]) => void,
    onToken: (token: string) => void,
): Promise<{ responseMessage: string; chatAttachments: ChatAttachment[]; newHierarchy: ContentHierarchy | null; allCards: Card[] | null; followUpQuestions: string[] }> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const idToken = await user.getIdToken();
    const res = await fetch("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({ message, messageHistory, attachments, projectId, preferences }),
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

        if (value) {
            buffer += decoder.decode(value, { stream: true });
        }

        // If stream ended, flush any remaining bytes from the decoder
        if (done) {
            buffer += decoder.decode();
        }

        let pos = 0; // position cursor while scanning buffer for complete updates

        while (true) {
            const updateStart = buffer.indexOf("\u001F", pos);
            if (updateStart === -1) break;

            // emit any tokens before the update marker
            if (updateStart > pos) {
                const token = buffer.slice(pos, updateStart);
                if (token.length > 0) onToken(token);
                // IMPORTANT: advance pos to the start of the update so we don't resend that token later
                pos = updateStart;
            }

            const updateEnd = buffer.indexOf("\u001E", pos);
            if (updateEnd === -1) {
                // incomplete update; keep the buffer from 'pos' (which currently points at the start marker)
                break;
            }

            const jsonStr = buffer.slice(pos + 1, updateEnd); // exclude marker chars
            pos = updateEnd + 1; // advance past this complete update

            try {
                const obj = JSON.parse(jsonStr);

                // phase message (old protocol sent { phase: ... })
                if (obj.phase) {
                    setPhase(obj.phase);
                    continue;
                }

                if (obj.type === "update") {
                    if (obj.responseMessage) {
                        setFinalResponseMessage({
                            content: obj.responseMessage,
                            isResponse: true,
                            attachments: obj.chatAttachments ?? null,
                        } as Message);
                    }
                    if (obj.newCards) {
                        setNewCards(JSON.parse(obj.newCards) as Card[]);
                    }
                    if (obj.followUpQuestions) {
                        console.log("Received follow-up questions update:", obj.followUpQuestions);
                        setFollowUpQuestions(JSON.parse(obj.followUpQuestions) as string[]);
                    }
                    continue;
                }

                if (obj.type === "final") {
                    // flush any tokens that appear after the final marker in the current buffer
                    if (pos < buffer.length) {
                        const trailing = buffer.slice(pos);
                        if (trailing.length > 0) onToken(trailing);
                    }
                    
                     return {
                          responseMessage: obj.responseMessage,
                          chatAttachments: obj.chatAttachments ?? [],
                          newHierarchy: obj.newHierarchy ?? null,
                          allCards: obj.allCards ?? null,
                          followUpQuestions: obj.followUpQuestions ?? [],
                      };
                }
            } catch (err) {
                console.warn("Failed to parse JSON update:", jsonStr, err);
                // ignore and continue scanning
            }
        } // end inner loop scanning for updates

        // If we processed something (pos > 0), drop processed prefix from buffer.
        // Otherwise (pos === 0) there were no complete updates; emit the whole buffer as a token
        // and clear it (this handles pure-token chunks with no interleaved JSON).
        if (pos > 0) {
            buffer = buffer.slice(pos);
        } else {
            // no update markers processed this iteration -> emit buffer as streaming text
            if (buffer.length > 0 && !done) {
                onToken(buffer);
                buffer = "";
            } else if (done) {
                // final flush: if buffer still contains text after done and no final message was found,
                // send it as tokens (the backend should have sent a final object, but be resilient)
                if (buffer.length > 0) {
                    onToken(buffer);
                    buffer = "";
                }
            }
        }

        if (done) break;
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

/**
 * Get the user's chat preferences.
 * @returns Promise resolving to ChatPreferences or null if not found.
 */
export async function getUserPreferences(): Promise<ChatPreferences | null> {
    try {
        const data = await apiFetch<{ preferences: ChatPreferences | null }>(
            "/api/chat/preferences",
            {
                method: "GET",
            }
        );
        return data.preferences;
    } catch (err) {
        console.error("Error fetching user preferences:", err);
        return null;
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
