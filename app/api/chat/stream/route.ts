import { NextRequest, NextResponse, after } from "next/server";

import { getVerifiedUid } from "@/app/api/helpers";
import { writeChatPairToDb, generateNewHierarchyFromCards, writeHierarchy, unlockCards, executeTutorActions, groundingChunksToCardsAndWrite } from "../helpers";
import { streamChatResponse } from "./helpers";
import { buildFinalChatAttachments, resolveNewcardRefs } from "./shared";
import { persistModelCards } from "./persist";
import { getProjectById } from "@/app/api/projects/helpers";
import { fetchCardsFromProject, copyCardsToDb, writeCardsToDb } from "@/app/api/cards/helpers";
import { copyUploadsToDb } from "@/app/api/uploads/helpers";
import { Card, ChatAttachment, FileAttachment, StreamPhase, GroundingChunk, DEFAULT_CHAT_PREFERENCES } from "@/lib/types";

const SECONDARY_GENERATION_MODEL = "flash-lite" as const;

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

                    const { responseMessage: chatResponseMessage, newCardsFromModel, writtenCards, chatAttachments, followUpQuestions, unlockedCardIds: parsedUnlockedCardIds, tutorActions } = result!;

                    updatePhase("processing");

                    let finalResponseMessage = chatResponseMessage.replace(/\[cite:[^\]]*\]/g, "");
                    const groundingChunks: GroundingChunk[] = chatAttachments.filter((a): a is GroundingChunk => "web" in a);
                    const currentCardsForResources = await fetchCardsFromProject(projectId);
                    const writtenResourceCards = groundingChunks.length > 0
                        ? await groundingChunksToCardsAndWrite(projectId, currentCardsForResources, groundingChunks)
                        : [];
                    const usedChunkUris = new Set(writtenResourceCards.map((card) => card.url).filter((url): url is string => !!url));
                    const allWrittenCards = [...writtenCards, ...writtenResourceCards];

                    if (preferences.googleSearch === "force" && groundingChunks.length === 0) {
                        console.warn("[chat-stream] googleSearch=force but no grounding chunks were returned", { projectId });
                    }

                    finalResponseMessage = resolveNewcardRefs(finalResponseMessage, allWrittenCards);
                    const finalAttachments = buildFinalChatAttachments(chatAttachments, allWrittenCards, usedChunkUris);

                    console.info("[chat-stream] pipeline summary", {
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

                    let unlockedCards: Card[] = [];
                    if (parsedUnlockedCardIds.length > 0 && cardsToUnlock.length > 0) {
                        const existingCardIds = new Set((effectivePreviousCards || []).map((c) => c.id));
                        unlockedCards = unlockCards(parsedUnlockedCardIds, cardsToUnlock, existingCardIds);
                        if (unlockedCards.length > 0) {
                            unlockedCards = unlockedCards.map((c) => ({ ...c, isUnlocked: true }));
                            await copyCardsToDb(projectId, unlockedCards);
                        }
                    }

                    if (unlockedCards.length > 0) {
                        sendUpdate("newCards", JSON.stringify([...unlockedCards]));
                    }

                    if (tutorActions && tutorActions.length > 0) {
                        try {
                            const actionResult = await executeTutorActions(
                                tutorActions,
                                projectId,
                                previousContentHierarchy || { title: "", children: [] },
                                effectivePreviousCards,
                                SECONDARY_GENERATION_MODEL,
                            );

                            if (actionResult.modifiedHierarchy) {
                                await writeHierarchy(projectId, actionResult.modifiedHierarchy);
                                sendUpdate("newHierarchy", JSON.stringify(actionResult.modifiedHierarchy));
                            }

                            if (actionResult.deletedCardIds.length > 0) {
                                sendUpdate("deletedCards", JSON.stringify(actionResult.deletedCardIds));
                            }
                        } catch (actionErr) {
                            console.error("Failed to execute tutor actions:", actionErr);
                        }
                    }

                    await writeChatPairToDb(message, attachments, finalResponseMessage, projectId, uid, finalAttachments, followUpQuestions);

                    const finalObj = {
                        type: "final" as const,
                        responseMessage: finalResponseMessage,
                        chatAttachments: finalAttachments,
                        newHierarchy: null,
                        allCards: null,
                        followUpQuestions,
                    };
                    controller.enqueue(encoder.encode("\u001F" + JSON.stringify(finalObj) + "\u001E"));

                    const backgroundCards = [...allWrittenCards, ...unlockedCards];
                    if (backgroundCards.length > 0) {
                        after(async () => {
                            try {
                                const currentCards = await fetchCardsFromProject(projectId);
                                const currentEffectiveCards = currentCards.filter((card) => !card.exclude && !card.labels?.includes("exclude from hierarchy"));
                                const currentProject = await getProjectById(projectId, uid);
                                const currentHierarchy = currentProject?.hierarchy || null;

                                try {
                                    const previousCardsForHierarchy = currentEffectiveCards.filter((c) => !backgroundCards.find((bc) => bc.id === c.id));
                                    const hierarchyCards = backgroundCards.filter((c) => !c.exclude && !c.labels?.includes("exclude from hierarchy"));
                                    const newHierarchy = await generateNewHierarchyFromCards(
                                                currentHierarchy,
                                                previousCardsForHierarchy,
                                                hierarchyCards,
                                                SECONDARY_GENERATION_MODEL,
                                            );
                                    if (newHierarchy) {
                                        await writeHierarchy(projectId, newHierarchy);
                                        console.info("[chat-stream] background hierarchy updated", {
                                            projectId,
                                            cardCount: hierarchyCards.length,
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
        console.error("/api/chat/stream POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
