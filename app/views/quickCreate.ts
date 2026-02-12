// app/views/quickCreate.ts

import { auth } from "@/lib/firebase";
import { Message, Card, StreamPhase, ContentHierarchy, ChatAttachment, ChatPreferences } from "@/lib/types";

/**
 * Streams a quick-create project request from the API.
 * Creates a new project and streams the first chat response in one call.
 * 
 * @param message The user's question/message.
 * @param attachments Optional file attachments.
 * @param preferences Chat preferences.
 * @param setPhase Callback for stream phase updates.
 * @param setFinalResponseMessage Callback for the final response message.
 * @param setNewCards Callback for newly generated cards.
 * @param setFollowUpQuestions Callback for follow-up questions.
 * @param onToken Callback for each streamed token.
 * @param onProjectId Callback when the projectId is received.
 * @returns The final result object with projectId.
 */
export async function streamQuickCreate(
    message: string,
    attachments: null | ChatAttachment[],
    preferences: ChatPreferences,
    setPhase: (phase: null | StreamPhase) => void,
    setFinalResponseMessage: (message: Message) => void,
    setNewCards: (newCards: Card[]) => void,
    setFollowUpQuestions: (questions: string[]) => void,
    onToken: (token: string) => void,
    onProjectId: (projectId: string) => void,
): Promise<{ projectId: string; responseMessage: string; chatAttachments: ChatAttachment[]; newHierarchy: ContentHierarchy | null; allCards: Card[] | null; followUpQuestions: string[] }> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const idToken = await user.getIdToken();
    const res = await fetch("/api/projects/quick-create", {
        method: "POST",
        body: JSON.stringify({ message, attachments, preferences }),
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
        },
    });

    if (!res.ok) {
        let errorMessage = `API request failed: ${res.status}`;
        try {
            const errorData = await res.json();
            if (errorData.error) errorMessage = errorData.error;
        } catch { /* ignore */ }
        throw new Error(errorMessage);
    }

    if (!res.body) throw new Error("No response body from stream");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedProjectId = "";

    while (true) {
        const { value, done } = await reader.read();

        if (value) {
            buffer += decoder.decode(value, { stream: true });
        }

        if (done) {
            buffer += decoder.decode();
        }

        let pos = 0;

        while (true) {
            const updateStart = buffer.indexOf("\u001F", pos);
            if (updateStart === -1) break;

            if (updateStart > pos) {
                const token = buffer.slice(pos, updateStart);
                if (token.length > 0) onToken(token);
                pos = updateStart;
            }

            const updateEnd = buffer.indexOf("\u001E", pos);
            if (updateEnd === -1) break;

            const jsonStr = buffer.slice(pos + 1, updateEnd);
            pos = updateEnd + 1;

            try {
                const obj = JSON.parse(jsonStr);

                if (obj.type === "error") {
                    throw new Error(obj.message || "Error received from quick-create stream");
                }

                // Handle projectId message
                if (obj.type === "projectId" && obj.projectId) {
                    receivedProjectId = obj.projectId;
                    onProjectId(obj.projectId);
                    continue;
                }

                // Phase message
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
                        const parsedCards = JSON.parse(obj.newCards) as Card[];
                        setNewCards(parsedCards);
                    }
                    if (obj.followUpQuestions) {
                        setFollowUpQuestions(JSON.parse(obj.followUpQuestions) as string[]);
                    }
                    continue;
                }

                if (obj.type === "final") {
                    if (pos < buffer.length) {
                        const trailing = buffer.slice(pos);
                        if (trailing.length > 0) onToken(trailing);
                    }

                    const result = {
                        projectId: obj.projectId || receivedProjectId,
                        responseMessage: obj.responseMessage,
                        chatAttachments: obj.chatAttachments ?? [],
                        newHierarchy: obj.newHierarchy ?? null,
                        allCards: obj.allCards ?? null,
                        followUpQuestions: obj.followUpQuestions ?? [],
                    };

                    const messageObj: Message = {
                        content: result.responseMessage,
                        isResponse: true,
                        attachments: result.chatAttachments.length > 0 ? result.chatAttachments : undefined,
                        followUpQuestions: result.followUpQuestions.length > 0 ? result.followUpQuestions : undefined
                    };
                    setFinalResponseMessage(messageObj);

                    return result;
                }
            } catch (err) {
                if (err instanceof Error && err.message.includes("Error received from quick-create stream")) {
                    throw err;
                }
                console.warn("Failed to parse JSON update:", jsonStr, err);
            }
        }

        if (pos > 0) {
            buffer = buffer.slice(pos);
        } else {
            if (buffer.length > 0 && !done) {
                onToken(buffer);
                buffer = "";
            } else if (done) {
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
