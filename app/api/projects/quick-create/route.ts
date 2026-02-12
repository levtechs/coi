import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "@/app/api/helpers";
import {
    writeChatPairToDb,
    generateAndWriteNewCards,
    groundingChunksToCardsAndWrite,
    generateNewHierarchyFromCards,
    writeHierarchy,
    updatePreferences,
} from "@/app/api/chat/helpers";
import { streamChatResponse } from "@/app/api/chat/stream/helpers";
import { createProject } from "@/app/api/projects/helpers";
import { Card, ContentHierarchy, ChatAttachment, StreamPhase, GroundingChunk, ChatPreferences } from "@/lib/types";

/**
 * Truncates a message to create a project title.
 * Takes the first ~50 characters, breaking at a word boundary.
 */
function generateTitleFromMessage(message: string): string {
    const trimmed = message.trim();
    if (trimmed.length <= 50) return trimmed;

    const truncated = trimmed.substring(0, 50);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 20) {
        return truncated.substring(0, lastSpace) + "...";
    }
    return truncated + "...";
}

export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    try {
        const body: {
            message: string;
            attachments: ChatAttachment[] | null;
            preferences: ChatPreferences;
        } = await req.json();
        const { message, attachments, preferences } = body;

        if (!message || message.trim() === "") {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Validate attachments
        if (attachments) {
            const { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB, ALLOWED_MIME_TYPES } = await import('@/lib/uploadConstants');
            const totalSize = attachments.reduce((sum, att) => {
                if ('type' in att && att.type === 'file') {
                    return sum + att.size;
                }
                return sum;
            }, 0);
            if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
                throw new Error(`Total attachment size exceeds ${MAX_UPLOAD_SIZE_MB}MB. Please remove some attachments.`);
            }
            for (const att of attachments) {
                if ('type' in att && att.type === 'file') {
                    if (!ALLOWED_MIME_TYPES.some(type => att.mimeType.startsWith(type))) {
                        throw new Error(`File type ${att.mimeType} not allowed. Only images and documents are permitted.`);
                    }
                }
            }
        }

        // Update user preferences
        await updatePreferences(uid, preferences);

        // Create the project with a title derived from the message
        const title = generateTitleFromMessage(message);
        const projectId = await createProject({
            title,
            hierarchy: { title: "", children: [] },
            cards: [],
            uploads: [],
        }, uid);

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let phase: StreamPhase = "starting";
                    const updatePhase = (newPhase: StreamPhase) => {
                        phase = newPhase;
                        controller.enqueue(encoder.encode('\u001F' + JSON.stringify({ phase: newPhase }) + '\u001E'));
                    };

                    const sendUpdate = (key: string, value: string, chatAttachments?: ChatAttachment[]) => {
                        const updateObj: { type: "update"; [key: string]: unknown } = { type: "update" };
                        updateObj[key] = value;
                        if (chatAttachments) updateObj.chatAttachments = chatAttachments;
                        controller.enqueue(
                            encoder.encode('\u001F' + JSON.stringify(updateObj) + '\u001E')
                        );
                    };

                    // Send the projectId immediately so the frontend can navigate
                    controller.enqueue(encoder.encode('\u001F' + JSON.stringify({ type: "projectId", projectId }) + '\u001E'));

                    updatePhase("starting");

                    let followUpDetected = false;
                    const startTime = Date.now();

                    // No previous cards/hierarchy for a brand new project
                    const result = await streamChatResponse(
                        message,
                        [], // no message history
                        null, // no previous cards
                        null, // no previous hierarchy
                        attachments,
                        preferences,
                        startTime,
                        (token: string) => {
                            if (phase === "starting") updatePhase("streaming");

                            if (token.includes('[FOLLOW_UP]')) {
                                followUpDetected = true;
                                const cleanToken = token.split('[FOLLOW_UP]')[0];
                                if (cleanToken) {
                                    controller.enqueue(encoder.encode(cleanToken));
                                }
                                return;
                            }

                            if (followUpDetected) {
                                return;
                            }

                            controller.enqueue(encoder.encode(token));
                        },
                    );

                    if (!result) {
                        throw new Error("Failed to generate response.");
                    }

                    const { responseMessage: chatResponseMessage, hasNewInfo, chatAttachments, followUpQuestions } = result;

                    updatePhase("processing");

                    let finalResponseMessage = chatResponseMessage;
                    finalResponseMessage = finalResponseMessage.replace(/\[cite:[^\]]*\]/g, '');

                    sendUpdate("responseMessage", finalResponseMessage, chatAttachments);

                    if (followUpQuestions.length > 0) {
                        sendUpdate("followUpQuestions", JSON.stringify(followUpQuestions));
                    }

                    // Save the chat pair to the new project
                    await writeChatPairToDb(message, attachments, finalResponseMessage, projectId, uid, chatAttachments, followUpQuestions);

                    // Generate/update content only if needed
                    let finalObj: {
                        type: "final";
                        projectId: string;
                        responseMessage: string;
                        chatAttachments: ChatAttachment[];
                        newHierarchy: ContentHierarchy | null;
                        allCards: Card[] | null;
                        followUpQuestions: string[];
                    } = {
                        type: "final",
                        projectId,
                        responseMessage: finalResponseMessage,
                        chatAttachments,
                        newHierarchy: null,
                        allCards: null,
                        followUpQuestions
                    };

                    if (hasNewInfo || chatAttachments.filter(a => !('time' in a)).length > 0) {
                        updatePhase("generating cards");

                        let newCards: Card[] = [];
                        try {
                            if (hasNewInfo) {
                                const [resultFromChat, cardsFromGrounding] = await Promise.all([
                                    generateAndWriteNewCards(projectId, [], message, finalResponseMessage, preferences.generationModel),
                                    groundingChunksToCardsAndWrite(projectId, [], chatAttachments.filter((a): a is GroundingChunk => 'web' in a)),
                                ]);
                                newCards = [...resultFromChat, ...cardsFromGrounding];
                            } else {
                                newCards = await groundingChunksToCardsAndWrite(projectId, [], chatAttachments.filter((a): a is GroundingChunk => 'web' in a));
                            }
                        } catch (cardErr) {
                            console.error("Failed to generate cards:", cardErr);
                            finalResponseMessage += "\n\n*Note: Card generation failed. Some information may not be properly organized.*";
                        }

                        if (newCards.length > 0) {
                            sendUpdate("newCards", JSON.stringify(newCards));
                        }

                        updatePhase("generating content");

                        let newHierarchy: ContentHierarchy | null = null;
                        try {
                            newHierarchy = await generateNewHierarchyFromCards(null, [], newCards, preferences.generationModel);
                            await writeHierarchy(projectId, newHierarchy);
                        } catch (hierarchyErr) {
                            console.error("Failed to generate hierarchy:", hierarchyErr);
                            finalResponseMessage += "\n\n*Note: Content hierarchy generation failed. Cards were created but organization may be incomplete.*";
                        }

                        finalObj = {
                            type: "final",
                            projectId,
                            responseMessage: finalResponseMessage,
                            chatAttachments,
                            newHierarchy,
                            allCards: newCards,
                            followUpQuestions
                        };
                    }

                    // Send final structured JSON object
                    controller.enqueue(encoder.encode('\u001F' + JSON.stringify(finalObj) + '\u001E'));
                } catch (err) {
                    console.error(err);
                    controller.enqueue(encoder.encode('\u001F' + JSON.stringify({ type: "error", message: (err as Error).message }) + '\u001E'));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    } catch (err) {
        console.error("/api/projects/quick-create POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
