import { NextRequest, NextResponse } from "next/server";

import { getVerifiedUid } from "@/app/api/helpers";
import { streamChatResponse } from "./helpers";
import { finalizeTaggedStream } from "./orchestrator";
import { persistModelCards } from "./persist";
import { getProjectById } from "@/app/api/projects/helpers";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
import { copyUploadsToDb } from "@/app/api/uploads/helpers";
import { Card, ChatAttachment, FileAttachment, StreamPhase, GroundingChunk, DEFAULT_CHAT_PREFERENCES } from "@/lib/types";

export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    try {
        const body: {
            message: string;
            messageHistory: { content: string; isResponse: boolean }[];
            projectId: string;
            attachments: ChatAttachment[] | null;
        } = await req.json();

        const { message, messageHistory, projectId, attachments } = body;
        const preferences = DEFAULT_CHAT_PREFERENCES;

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

        const project = await getProjectById(projectId, uid);
        if (!project) {
            return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
        }

        const previousContentHierarchy = project.hierarchy;
        const previousCards = await fetchCardsFromProject(projectId);
        const effectivePreviousCards = previousCards.filter((card) => !card.exclude && !card.labels?.includes("exclude from hierarchy"));
        const fileAttachments = (attachments || []).filter((att): att is FileAttachment => "type" in att && att.type === "file");

        if (fileAttachments.length > 0) {
            try {
                await copyUploadsToDb(projectId, fileAttachments);
            } catch (uploadErr) {
                console.error("Failed to persist chat file attachments to uploads:", uploadErr);
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

                    updatePhase("starting");

                    const cardsToUnlock = project.courseLesson?.cardsToUnlock || [];
                    const onNewCards = persistModelCards(projectId, sendUpdate);

                    const result = await streamChatResponse(
                        message,
                        messageHistory,
                        effectivePreviousCards,
                        previousContentHierarchy,
                        attachments,
                        preferences,
                        (token: string) => {
                            if (phase === "starting") updatePhase("streaming");
                            controller.enqueue(encoder.encode(token));
                        },
                        onNewCards,
                        cardsToUnlock,
                        project.courseLesson,
                    );

                    const { newCardsFromModel, writtenCards, chatAttachments } = result!;

                    updatePhase("processing");

                    const groundingChunks: GroundingChunk[] = chatAttachments.filter((a): a is GroundingChunk => "web" in a);
                    const finalized = await finalizeTaggedStream({
                        mode: "existing",
                        projectId,
                        uid,
                        message,
                        attachments,
                        response: result!,
                        sendUpdate,
                        previousContentHierarchy,
                        effectivePreviousCards,
                        cardsToUnlock,
                    });

                    console.info("[chat-stream] pipeline summary", {
                        projectId,
                        parsedNewCards: newCardsFromModel.length,
                        parsedResourceCards: 0,
                        writtenCards: finalized.allWrittenCards.length,
                        groundingChunks: groundingChunks.length,
                        sourceChunks: groundingChunks.length,
                        hasSourcesAttachment: finalized.finalAttachments.some((attachment) => "type" in attachment && attachment.type === "sources"),
                    });

                    const finalObj = {
                        type: "final" as const,
                        responseMessage: finalized.finalResponseMessage,
                        chatAttachments: finalized.finalAttachments,
                        newHierarchy: null,
                        allCards: null,
                        followUpQuestions: finalized.followUpQuestions,
                    };
                    controller.enqueue(encoder.encode("\u001F" + JSON.stringify(finalObj) + "\u001E"));
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
        console.error("/api/chat/stream POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
