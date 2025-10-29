import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "@/app/api/helpers";
import {
    writeChatPairToDb,
    generateAndWriteNewCards,
    groundingChunksToCardsAndWrite,
    generateNewHierarchyFromCards,
    writeHierarchy,
    updatePreferences,
} from "../helpers";
import { streamChatResponse } from "./helpers";
import { getProjectById } from "@/app/api/projects/helpers";
import { fetchCardsFromProject, copyCardsToDb } from "@/app/api/cards/helpers";
import { Card, ContentHierarchy, ChatAttachment, StreamPhase, GroundingChunk, ChatPreferences } from "@/lib/types";

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
            attachments: ChatAttachment[] | null; // added attachments
            preferences: ChatPreferences;
        } = await req.json();
        const { message, messageHistory, projectId, attachments, preferences } = body;



        // Update user preferences
        await updatePreferences(uid, preferences);

        // Load the project for hierarchy
        const project = await getProjectById(projectId, uid);
        if (!project) {
            console.error(`Project ${projectId} not found or access denied for user ${uid}`);
            return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
        }

        const previousContentHierarchy = project.hierarchy;
        const previousCards: Card[] = await fetchCardsFromProject(projectId);
        const effectivePreviousCards = previousCards.filter((card: Card) => !card.exclude); // cards that are not excluded

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // phase is of type StreamPhase
                    let phase: StreamPhase = "starting"
                    const updatePhase = (newPhase : StreamPhase) => {
                        phase = newPhase;
                        controller.enqueue(encoder.encode('\u001F' + JSON.stringify({ phase: newPhase }) + '\u001E'));
                    }

                    const sendUpdate = (key: string, value: string, chatAttachments?: ChatAttachment[]) => {
                        const updateObj: { type: "update"; [key: string]: unknown } = { type: "update" };
                        updateObj[key] = value;
                        if (chatAttachments) updateObj.chatAttachments = chatAttachments;
                        controller.enqueue(
                            encoder.encode('\u001F' + JSON.stringify(updateObj) + '\u001E')
                        );
                    };
                    
                    updatePhase("starting");

                    let followUpDetected = false;
                    const startTime = Date.now();

                    const result = await streamChatResponse(
                        message,
                        messageHistory,
                        effectivePreviousCards,
                        previousContentHierarchy,
                        attachments,
                        preferences,
                        startTime,
                        (token: string) => {
                            if (phase === "starting") updatePhase("streaming");

                            // Check if this token contains [FOLLOW_UP]
                            if (token.includes('[FOLLOW_UP]')) {
                                followUpDetected = true;
                                // Send only the part before [FOLLOW_UP]
                                const cleanToken = token.split('[FOLLOW_UP]')[0];
                                if (cleanToken) {
                                    controller.enqueue(encoder.encode(cleanToken));
                                }
                                return; // Don't send the rest
                            }

                            // If follow-up has been detected, don't send subsequent tokens
                            if (followUpDetected) {
                                return;
                            }

                            // Send tokens directly without \n
                            controller.enqueue(encoder.encode(token));
                        }
                    );

                    const { responseMessage, hasNewInfo, chatAttachments, followUpQuestions } = result!;

                    updatePhase("processing"); // phase 2

                    let finalResponseMessage = responseMessage;
                    // Remove citation markers
                    finalResponseMessage = finalResponseMessage.replace(/\[cite:[^\]]*\]/g, '');

                    //controller.enqueue(encoder.encode(JSON.stringify({ type: "update", responseMessage }) + "\n"));
                    sendUpdate("responseMessage", finalResponseMessage, chatAttachments);

                    // Send follow-up questions immediately after streaming
                    if (followUpQuestions.length > 0) {
                        sendUpdate("followUpQuestions", JSON.stringify(followUpQuestions));
                    }

                    // Save the chat pair
                    await writeChatPairToDb(message, attachments, finalResponseMessage, projectId, uid, chatAttachments);

                    // Generate/update content only if needed
                    let finalObj: {
                        type: "final";
                        responseMessage: string;
                        chatAttachments: ChatAttachment[];
                        newHierarchy: ContentHierarchy | null;
                        allCards: Card[] | null;
                        followUpQuestions: string[];
                    } = {
                        type: "final",
                        responseMessage: finalResponseMessage,
                        chatAttachments,
                        newHierarchy: null,
                        allCards: null,
                        followUpQuestions
                    };

                    if (hasNewInfo || chatAttachments.filter(a => !('time' in a)).length > 0) {
                        updatePhase("generating cards"); // phase 3

                        let newCards: Card[] = []
                        let unlockedCards: Card[] = []
                        try {
                            if (hasNewInfo) {
                                const cardsToUnlock = project.courseLesson?.cardsToUnlock || [];
                                const [resultFromChat, cardsFromGrounding] = await Promise.all([
                                    generateAndWriteNewCards(projectId, effectivePreviousCards, message, responseMessage, cardsToUnlock, preferences.generationModel),
                                    groundingChunksToCardsAndWrite(projectId, previousCards, chatAttachments.filter((a): a is GroundingChunk => 'web' in a)),
                                ]);

                                newCards = [...resultFromChat.newCards, ...cardsFromGrounding];
                                unlockedCards = resultFromChat.unlockedCards;
                            }
                            else { // There are chatAttachments but hasNewInfo is false
                                newCards = await groundingChunksToCardsAndWrite(projectId, previousCards, chatAttachments.filter((a): a is GroundingChunk => 'web' in a))
                            }
                        } catch (cardErr) {
                            console.error("Failed to generate cards:", cardErr);
                            finalResponseMessage += "\n\n*Note: Card generation failed. Some information may not be properly organized.*";
                        }

                        if (unlockedCards.length > 0) {
                            unlockedCards = unlockedCards.map(c => ({ ...c, isUnlocked: true }));
                            await copyCardsToDb(projectId, unlockedCards);
                        }

                        if (newCards.length > 0 || unlockedCards.length > 0) {
                            sendUpdate("newCards", JSON.stringify([...newCards, ...unlockedCards]));
                        }

                        updatePhase("generating content"); // phase 4

                        let newHierarchy: any = null;
                        try {
                            newHierarchy = await generateNewHierarchyFromCards(previousContentHierarchy, effectivePreviousCards, [...newCards, ...unlockedCards], preferences.generationModel);
                            await writeHierarchy(projectId, newHierarchy);
                        } catch (hierarchyErr) {
                            console.error("Failed to generate hierarchy:", hierarchyErr);
                            // Log error in chat by adding to responseMessage or as a separate message
                            finalResponseMessage += "\n\n*Note: Content hierarchy generation failed. Cards were created but organization may be incomplete.*";
                        }

                        const allCards = previousCards ? [...previousCards, ...newCards, ...unlockedCards] : [...newCards, ...unlockedCards];

                        finalObj = {
                            type: "final",
                            responseMessage: finalResponseMessage,
                            chatAttachments,
                            newHierarchy,
                            allCards,
                            followUpQuestions
                        };
                    }

                    // Send final structured JSON object
                    controller.enqueue(encoder.encode('\u001F' + JSON.stringify(finalObj) + '\u001E'));
                } catch (err) {
                    console.error(err);
                    controller.enqueue("\n" + encoder.encode(JSON.stringify({ type: "error", message: (err as Error).message }) + "\n"));
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
        console.error("/api/chat/stream POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
