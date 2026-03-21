import { NextRequest, NextResponse, after } from "next/server";

import { getVerifiedUid } from "@/app/api/helpers";
import { writeChatPairToDb, generateNewHierarchyFromCards, writeHierarchy, groundingChunksToCardsAndWrite } from "@/app/api/chat/helpers";
import { streamChatResponse } from "@/app/api/chat/stream/helpers";
import { buildFinalChatAttachments, resolveNewcardRefs } from "@/app/api/chat/stream/shared";
import { persistModelCards } from "@/app/api/chat/stream/persist";
import { createProject } from "@/app/api/projects/helpers";
import { copyUploadsToDb } from "@/app/api/uploads/helpers";
import { ChatAttachment, FileAttachment, StreamPhase, GroundingChunk, DEFAULT_CHAT_PREFERENCES } from "@/lib/types";

const SECONDARY_GENERATION_MODEL = "flash-lite" as const;

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
        } = await req.json();
        const { message, attachments } = body;
        const preferences = DEFAULT_CHAT_PREFERENCES;

        if (!message || message.trim() === "") {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        if (attachments) {
            const { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB, ALLOWED_MIME_TYPES } = await import("@/lib/uploadConstants");
            const totalSize = attachments.reduce((sum, att) => {
                if ("type" in att && att.type === "file") return sum + att.size;
                return sum;
            }, 0);

            if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
                throw new Error(`Total attachment size exceeds ${MAX_UPLOAD_SIZE_MB}MB. Please remove some attachments.`);
            }

            for (const att of attachments) {
                if ("type" in att && att.type === "file") {
                    if (!ALLOWED_MIME_TYPES.some((type) => att.mimeType.startsWith(type))) {
                        throw new Error(`File type ${att.mimeType} not allowed. Only images and documents are permitted.`);
                    }
                }
            }
        }

        const title = generateTitleFromMessage(message);
        const projectId = await createProject({
            title,
            hierarchy: { title: "", children: [] },
            cards: [],
            uploads: [],
        }, uid);

        const fileAttachments = (attachments || []).filter((att): att is FileAttachment => "type" in att && att.type === "file");
        if (fileAttachments.length > 0) {
            try {
                await copyUploadsToDb(projectId, fileAttachments);
            } catch (uploadErr) {
                console.error("Failed to persist quick-create file attachments to uploads:", uploadErr);
            }
        }

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let phase: StreamPhase = "starting";
                    const updatePhase = (newPhase: StreamPhase) => {
                        phase = newPhase;
                        controller.enqueue(encoder.encode("\u001F" + JSON.stringify({ phase: newPhase }) + "\u001E"));
                    };

                    const sendUpdate = (key: string, value: string, chatAttachments?: ChatAttachment[]) => {
                        const updateObj: { type: "update"; [key: string]: unknown } = { type: "update" };
                        updateObj[key] = value;
                        if (chatAttachments) updateObj.chatAttachments = chatAttachments;
                        controller.enqueue(encoder.encode("\u001F" + JSON.stringify(updateObj) + "\u001E"));
                    };

                    controller.enqueue(encoder.encode("\u001F" + JSON.stringify({ type: "projectId", projectId }) + "\u001E"));
                    updatePhase("starting");

                    const onNewCards = persistModelCards(projectId, sendUpdate);

                    const result = await streamChatResponse(
                        message,
                        [],
                        null,
                        null,
                        attachments,
                        preferences,
                        (token: string) => {
                            if (phase === "starting") updatePhase("streaming");
                            controller.enqueue(encoder.encode(token));
                        },
                        onNewCards,
                    );

                    if (!result) throw new Error("Failed to generate response.");

                    const { responseMessage: chatResponseMessage, newCardsFromModel, writtenCards, chatAttachments, followUpQuestions } = result;

                    updatePhase("processing");

                    let finalResponseMessage = chatResponseMessage.replace(/\[cite:[^\]]*\]/g, "");
                    const groundingChunks: GroundingChunk[] = chatAttachments.filter((a): a is GroundingChunk => "web" in a);
                    const writtenResourceCards = groundingChunks.length > 0
                        ? await groundingChunksToCardsAndWrite(projectId, writtenCards, groundingChunks)
                        : [];
                    const usedChunkUris = new Set<string>();
                    const allWrittenCards = [...writtenCards, ...writtenResourceCards];

                    if (preferences.googleSearch === "force" && groundingChunks.length === 0) {
                        console.warn("[quick-create] googleSearch=force but no grounding chunks were returned", { projectId });
                    }

                    finalResponseMessage = resolveNewcardRefs(finalResponseMessage, allWrittenCards);
                    const finalAttachments = buildFinalChatAttachments(chatAttachments, allWrittenCards, usedChunkUris);

                    console.info("[quick-create] pipeline summary", {
                        projectId,
                        parsedNewCards: newCardsFromModel.length,
                        parsedResourceCards: 0,
                        writtenCards: allWrittenCards.length,
                        groundingChunks: groundingChunks.length,
                        sourceChunks: groundingChunks.length,
                        hasSourcesAttachment: finalAttachments.some((attachment) => "type" in attachment && attachment.type === "sources"),
                    });

                    sendUpdate("responseMessage", finalResponseMessage, finalAttachments);
                    if (writtenResourceCards.length > 0) {
                        sendUpdate("newCards", JSON.stringify(writtenResourceCards));
                    }
                    if (followUpQuestions.length > 0) {
                        sendUpdate("followUpQuestions", JSON.stringify(followUpQuestions));
                    }
                    await writeChatPairToDb(message, attachments, finalResponseMessage, projectId, uid, finalAttachments, followUpQuestions);

                    const finalObj = {
                        type: "final" as const,
                        projectId,
                        responseMessage: finalResponseMessage,
                        chatAttachments: finalAttachments,
                        newHierarchy: null,
                        allCards: null,
                        followUpQuestions,
                    };
                    controller.enqueue(encoder.encode("\u001F" + JSON.stringify(finalObj) + "\u001E"));

                    if (allWrittenCards.length > 0) {
                        after(async () => {
                            try {
                                try {
                                    const newHierarchy = await generateNewHierarchyFromCards(null, [], allWrittenCards, SECONDARY_GENERATION_MODEL);
                                    if (newHierarchy) {
                                        await writeHierarchy(projectId, newHierarchy);
                                        console.info("[quick-create] background hierarchy updated", {
                                            projectId,
                                            cardCount: allWrittenCards.length,
                                        });
                                    }
                                } catch (hierarchyErr) {
                                    console.error("Background hierarchy generation failed:", hierarchyErr);
                                }
                            } catch (bgErr) {
                                console.error("Background job error:", bgErr);
                            }
                        });
                    }
                } catch (err) {
                    console.error(err);
                    controller.enqueue(encoder.encode("\u001F" + JSON.stringify({ type: "error", message: (err as Error).message }) + "\u001E"));
                } finally {
                    controller.close();
                }
            },
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
