import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "@/app/api/helpers";
import {
    writeChatPairToDb,
    getPreviousHierarchy,
    generateAndWriteNewCards,
    generateNewHierarchyFromCards,
    writeHierarchy,
    //  === \/ below is depricated \/ 
    writeNewContentToDb,
    getPreviousContent,
    getUpdatedContent,
} from "../helpers";
import { streamChatResponse } from "./helpers";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
import { Card, ContentHierarchy, ChatAttachment, StreamPhase } from "@/lib/types";

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
                        controller.enqueue(encoder.encode(JSON.stringify({ phase: newPhase }) + "\n"));
                    }

                    const sendUpdate = (key: string, value: string) => {
                        controller.enqueue(
                            encoder.encode(JSON.stringify({ type: "update", [key]: value }) + "\n")
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

                             // Since the response may be plain text, send tokens directly
                             controller.enqueue(encoder.encode(token));
                         }
                     );
                     controller.enqueue(encoder.encode("\n")); // phase 2

                     updatePhase("processing"); // phase 2

                     const { responseMessage, hasNewInfo } = result!;

                    //controller.enqueue(encoder.encode(JSON.stringify({ type: "update", responseMessage }) + "\n"));
                    sendUpdate("responseMessage", responseMessage);

                    // Save the chat pair
                    await writeChatPairToDb(message, attachments, responseMessage, projectId, uid);

                    // Generate/update content only if needed
                    let finalObj: {
                        type: "final";
                        responseMessage: string;
                        newHierarchy: ContentHierarchy | null;
                        allCards: Card[] | null;
                    } = {
                        type: "final",
                        responseMessage,
                        newHierarchy: null,
                        allCards: null
                    };

                    /* Old popeline - depricated
                    if (hasNewInfo) {
                        updatePhase("generating content"); // phase 3

                        const newContent = await getUpdatedContent(previousContent, message, responseMessage);

                        if (newContent) {
                            await writeNewContentToDb(newContent, projectId);

                            updatePhase("generating cards"); // phase 4
                            const allCards = await extractWriteCards(projectId, newContent);
                            finalObj = {
                                type: "final",
                                responseMessage,
                                newContent,
                                allCards
                            };
                        }
                    }
                    */
                    if (hasNewInfo) {
                        updatePhase("generating cards"); // phase 3

                        const newCards: Card[] = await generateAndWriteNewCards(projectId, effectivePreviousCards, message, responseMessage);
                        const allCards = (previousCards ? [...previousCards, ...newCards] : newCards);

                        sendUpdate("newCards", JSON.stringify(newCards));

                        updatePhase("generating content"); // phase 4

                        const newHierarchy: ContentHierarchy = await generateNewHierarchyFromCards(previousContentHierarchy, effectivePreviousCards, newCards);
                        await writeHierarchy(projectId, newHierarchy);

                        finalObj = {
                            type: "final",
                            responseMessage,
                            newHierarchy,
                            allCards
                        };
                    }

                    // Send final structured JSON object
                    controller.enqueue(encoder.encode(JSON.stringify(finalObj) + "\n"));
                    controller.close();

                } catch (err) {
                    console.error(err);
                    controller.enqueue("\n" + encoder.encode(JSON.stringify({ type: "error", message: (err as Error).message }) + "\n"));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "application/x-ndjson",
            },
        });
    } catch (err) {
        console.error("/api/chat/stream POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
