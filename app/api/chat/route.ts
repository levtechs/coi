import { NextRequest, NextResponse } from "next/server";

import { GEMINI_API_URL, systemInstruction, INITIAL_DELAY_MS, MAX_RETRIES} from "./config";

import { Message } from "@/lib/types";

// Assume GEMINI_API_KEY is correctly set in your .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

export async function POST(req: NextRequest) {
    const uid = req.headers.get("x-user-id");
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    try {
        const body = await req.json();
        const { message, messageHistory, projectId } = body as { message: string, messageHistory: Message[], projectId: string };

        // Ensure the current message is not empty
        if (!message || message.trim() === "") {
            return NextResponse.json({ error: "Message is required." }, { status: 400 });
        }

        // The Gemini API expects a structured array of contents.
        const contents = (messageHistory || [])
            .filter((msg) => msg.content && msg.content.trim() !== "")
            .map((msg) => ({
                role: msg.isResponse ? "model" : "user",
                parts: [{ text: msg.content }]
            }));

        // Add the current user message to the end of the conversation history.
        contents.push({
            role: "user",
            parts: [{ text: message }]
        });
        
        // Loop for retries with exponential backoff
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents,
                        systemInstruction,
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 4096
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;

                    writeToDb(message, result, projectId, uid);

                    return NextResponse.json({ response: result || "" });
                }

                // Check for a retryable error (e.g., 500, 503)
                if (response.status === 503 || response.status === 500) {
                    if (i === MAX_RETRIES - 1) {
                        const errorText = await response.text();
                        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
                    }
                    const delay = INITIAL_DELAY_MS * Math.pow(2, i);
                    console.error(`Gemini API returned ${response.status}. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // Non-retryable error, throw it immediately
                    const errorText = await response.text();
                    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
                }
            } catch (err) {
                // If it's a network error, log and retry
                if (i === MAX_RETRIES - 1) {
                    // Re-throw if it's the last attempt
                    throw err;
                }
                const delay = INITIAL_DELAY_MS * Math.pow(2, i);
                console.error(`Attempt ${i + 1} failed with network error. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // If the loop finishes without success, return a server error
        return NextResponse.json({ error: "Failed to get a response after multiple retries." }, { status: 500 });
        
    } catch (err) {
        console.error("Error in /api/chat:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

const writeToDb = (message: string, result: string, projectId: string, uid: string) => {
    return
}