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

                    const sendUpdate = (key: string, value: string, groundingChunks?: GroundingChunk[]) => {
                        const updateObj: { type: "update"; [key: string]: unknown } = { type: "update" };
                        updateObj[key] = value;
                        if (groundingChunks) updateObj.groundingChunks = groundingChunks;
                        controller.enqueue(
                            encoder.encode('\u001F' + JSON.stringify(updateObj) + '\u001E')
                        );
                    };
                    
                    updatePhase("starting");

                    const result = await streamChatResponse(
                        message,
                        messageHistory,
                        effectivePreviousCards,
                        previousContentHierarchy,
                        attachments,
                        preferences,
                        (token: string) => {
                            if (phase === "starting") updatePhase("streaming");

                            // Send tokens directly without \n
                            controller.enqueue(encoder.encode(token));
                        }
                    );

                    updatePhase("processing"); // phase 2

                    const { responseMessage, hasNewInfo, groundingChunks } = result!;

                    let finalResponseMessage = responseMessage;
                    // Remove citation markers
                    finalResponseMessage = finalResponseMessage.replace(/\[cite:[^\]]*\]/g, '');

                    //controller.enqueue(encoder.encode(JSON.stringify({ type: "update", responseMessage }) + "\n"));
                    sendUpdate("responseMessage", finalResponseMessage, groundingChunks);

                    // Save the chat pair
                    await writeChatPairToDb(message, attachments, finalResponseMessage, projectId, uid, groundingChunks);

                    // Generate/update content only if needed
                    let finalObj: {
                        type: "final";
                        responseMessage: string;
                        groundingChunks: GroundingChunk[];
                        newHierarchy: ContentHierarchy | null;
                        allCards: Card[] | null;
                    } = {
                        type: "final",
                        responseMessage: finalResponseMessage,
                        groundingChunks,
                        newHierarchy: null,
                        allCards: null
                    };

                    if (hasNewInfo || groundingChunks.length>0) {
                        updatePhase("generating cards"); // phase 3

                        let newCards: Card[] = []
                        let unlockedCards: Card[] = []
                        if (hasNewInfo) {
                            const cardsToUnlock = project.courseLesson?.cardsToUnlock || [];
                            const [resultFromChat, cardsFromGrounding] = await Promise.all([
                                generateAndWriteNewCards(projectId, effectivePreviousCards, message, responseMessage, cardsToUnlock),
                                groundingChunksToCardsAndWrite(projectId, previousCards, groundingChunks),
                            ]);

                            newCards = [...resultFromChat.newCards, ...cardsFromGrounding];
                            unlockedCards = resultFromChat.unlockedCards;
                        }
                        else { // There are groundingChunks but hasNewInfo is false
                            newCards = await groundingChunksToCardsAndWrite(projectId, previousCards, groundingChunks)
                        }

                        if (unlockedCards.length > 0) {
                            unlockedCards = unlockedCards.map(c => ({ ...c, isUnlocked: true }));
                            await copyCardsToDb(projectId, unlockedCards);
                        }

                        sendUpdate("newCards", JSON.stringify([...newCards, ...unlockedCards]));

                        updatePhase("generating content"); // phase 4

                        const newHierarchy = await generateNewHierarchyFromCards(previousContentHierarchy, effectivePreviousCards, [...newCards, ...unlockedCards]);
                        await writeHierarchy(projectId, newHierarchy);

                        const allCards = previousCards ? [...previousCards, ...newCards, ...unlockedCards] : [...newCards, ...unlockedCards];

                        finalObj = {
                            type: "final",
                            responseMessage: finalResponseMessage,
                            groundingChunks,
                            newHierarchy,
                            allCards
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
