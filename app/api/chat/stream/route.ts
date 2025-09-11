import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "@/app/api/helpers";
import {
    writeChatPairToDb,
    writeNewContentToDb,
    getPreviousContent,
    getUpdatedContent
} from "../helpers";
import { streamChatResponse } from "./helpers";
import { extractWriteCards } from "@/app/api/cards/helpers";
import { Card, StreamPhase } from "@/lib/types";

interface ChatRequestBody {
    message: string;
    messageHistory: { content: string; isResponse: boolean }[];
    projectId: string;
}

export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    try {
        const body: ChatRequestBody = await req.json();
        const { message, messageHistory, projectId } = body;

        const previousContent = await getPreviousContent(projectId);
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // phase is of type StreamPhase
                    let phase = "starting"
                    const updatePhase = (newPhase : StreamPhase) => {
                        phase = newPhase;
                        controller.enqueue(encoder.encode(JSON.stringify({ phase: newPhase }) + "\n"));
                    }
                    
                    updatePhase("starting");

                    let response = "";
                    let capturing = false;
                    let inEscape = false;
                    let unicodeBuffer = "";
                    let expectingUnicode = 0;

                    await streamChatResponse(
                        message,
                        messageHistory,
                        previousContent,
                        (token: string) => {
                            response += token;

                            if (phase === "starting") updatePhase("streaming"); 

                            for (let i = 0; i < token.length; i++) {
                                const char = token[i];

                                // 1. Detect the start of "responseMessage"
                                if (!capturing) {
                                    const idx = response.indexOf('"responseMessage":');
                                    if (idx !== -1) {
                                        const openQuote = response.indexOf('"', idx + 18);
                                        if (openQuote !== -1 && i >= openQuote) {
                                            capturing = true;
                                            continue; // next char starts message
                                        }
                                    }
                                    continue;
                                }

                                // 2. Inside responseMessage
                                if (expectingUnicode > 0) {
                                    unicodeBuffer += char;
                                    expectingUnicode--;
                                    if (expectingUnicode === 0) {
                                        try {
                                            const codePoint = parseInt(unicodeBuffer, 16);
                                            controller.enqueue(encoder.encode(String.fromCharCode(codePoint)));
                                        } catch {
                                            // invalid \uXXXX, drop or log
                                        }
                                        unicodeBuffer = "";
                                    }
                                    continue;
                                }

                                if (inEscape) {
                                    switch (char) {
                                        case '"': controller.enqueue(encoder.encode('"')); break;
                                        case "\\": controller.enqueue(encoder.encode("\\")); break;
                                        case "/": controller.enqueue(encoder.encode("/")); break;
                                        case "b": controller.enqueue(encoder.encode("\b")); break;
                                        case "f": controller.enqueue(encoder.encode("\f")); break;
                                        case "n": controller.enqueue(encoder.encode("\n")); break;
                                        case "r": controller.enqueue(encoder.encode("\r")); break;
                                        case "t": controller.enqueue(encoder.encode("\t")); break;
                                        case "u": expectingUnicode = 4; unicodeBuffer = ""; break;
                                        default: controller.enqueue(encoder.encode(char)); break;
                                    }
                                    inEscape = false;
                                    continue;
                                }

                                if (char === "\\") {
                                    inEscape = true;
                                    continue;
                                }

                                if (char === '"') {
                                    // 3. Closing quote of responseMessage
                                    capturing = false;
                                    return;
                                }

                                controller.enqueue(encoder.encode(char)); // Normal character
                            }
                        }
                    );
                    controller.enqueue(encoder.encode("\n")); // phase 2

                    updatePhase("processing"); // phase 2

                    // Now safely parse the final JSON once
                    let parsed: { responseMessage: string; hasNewInfo: boolean };
                    try {
                        parsed = JSON.parse(response);
                    } catch (err) {
                        throw new Error("Invalid JSON returned from model: " + (err as Error).message);
                    }

                    const { responseMessage, hasNewInfo } = parsed;

                    controller.enqueue(encoder.encode(JSON.stringify({ type: "update", responseMessage }) + "\n"));

                    // 2. Save the chat pair
                    await writeChatPairToDb(message, responseMessage, projectId, uid);

                    // 3. Generate/update content only if needed
                    let finalObj: {
                        type: "final";
                        responseMessage: string;
                        newContent: JSON | null;
                        allCards: Card[] | null;
                    } = {
                        type: "final",
                        responseMessage,
                        newContent: null,
                        allCards: null
                    };

                    if (hasNewInfo) {
                        updatePhase("generating content"); // phase 3

                        const newContent = await getUpdatedContent(previousContent, message, responseMessage);

                        if (newContent) {
                            await writeNewContentToDb(newContent, projectId);

                            updatePhase("generating content"); // phase 4
                            const allCards = await extractWriteCards(projectId, newContent);
                            finalObj = {
                                type: "final",
                                responseMessage,
                                newContent,
                                allCards
                            };
                        }
                    }

                    // 4. Send final structured JSON object
                    controller.enqueue(encoder.encode(JSON.stringify(finalObj) + "\n"));
                    controller.close();

                } catch (err) {
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
