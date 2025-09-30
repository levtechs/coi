import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "@/app/api/helpers";
import {
    writeChatPairToDb,
    getPreviousHierarchy,
    generateAndWriteNewCards,
    groundingChunksToCardsAndWrite,
    generateNewHierarchyFromCards,
    writeHierarchy,
} from "../helpers";
import { streamChatResponse } from "./helpers";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
import { Card, ContentHierarchy, ChatAttachment, StreamPhase, GroundingChunk } from "@/lib/types";

interface ChatRequestBody {
    message: string;
    messageHistory: { content: string; isResponse: boolean }[];
    projectId: string;
    attachments: ChatAttachment[] | null; // added attachments
}

export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    try {
        const body: ChatRequestBody = await req.json();
        const { message, messageHistory, projectId, attachments } = body;

        //const previousContent = await getPreviousContent(projectId);
        const previousContentHierarchy = await getPreviousHierarchy(projectId);
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

                    if (hasNewInfo) {
                        updatePhase("generating cards"); // phase 3

                        const [cardsFromChat, cardsFromGrounding] = await Promise.all([
                            generateAndWriteNewCards(projectId, effectivePreviousCards, message, responseMessage),
                            groundingChunksToCardsAndWrite(projectId, previousCards, groundingChunks),
                        ]);

                        const newCards = [...cardsFromChat, ...cardsFromGrounding];

                        const allCards = (previousCards ? [...previousCards, ...newCards] : newCards);

                        sendUpdate("newCards", JSON.stringify(newCards));

                        updatePhase("generating content"); // phase 4

                        const newHierarchy: ContentHierarchy = await generateNewHierarchyFromCards(previousContentHierarchy, effectivePreviousCards, newCards);
                        await writeHierarchy(projectId, newHierarchy);

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
