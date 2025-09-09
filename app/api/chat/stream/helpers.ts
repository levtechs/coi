import {
    GenerateContentRequest,
} from "@google/generative-ai";

import { Message } from "@/lib/types"; // { content: string; isResponse: boolean }

import { 
    limitedGeneralConfig,
    model,
} from "@/app/api/gemini/config";
import {
    chatResponseSystemInstruction, 
    firstChatResponseSystemInstruction, 
} from "../config"

/**
 * Streams a Gemini chat response. Calls onToken(token) for each text chunk received.
 * Returns parsed final JSON (responseMessage, hasNewInfo) once streaming completes.
 */
export async function streamChatResponse(
    message: string,
    messageHistory: Message[],
    prevContent: string | null,
    onToken: (token: string) => Promise<void> | void
): Promise<{ responseMessage: string; hasNewInfo: boolean } | null> {
    if (!message || message.trim() === "") throw new Error("Message is required.");

    // Build contents array as Gemini expects: each content has role and parts (parts are objects with text)
    const contents = (messageHistory || [])
        .filter((m) => m.content && m.content.trim() !== "")
        .map((m) => ({
        role: m.isResponse ? "model" : "user",
        parts: [{ text: m.content }],
        }));

    contents.push({
        role: "user",
        parts: [{ text: message }],
    });
    
    if (prevContent) {
        contents.push({
            role: "user",
            parts: [{text: `EXISTING NOTES: ${JSON.stringify(prevContent)}`}]
        })
    }
    
    // systemInstruction must be a Content object with a role
    const systemInstruction = prevContent
        ? { role: "system", parts: chatResponseSystemInstruction.parts }
        : { role: "system", parts: firstChatResponseSystemInstruction.parts };

    const requestBody: GenerateContentRequest = {
        contents,
        systemInstruction,
        generationConfig: {
            ...limitedGeneralConfig,
            responseMimeType: "application/json",
        },
    };

    try {
        // NOTE: cast to any to avoid SDK typing mismatches — adapt to your SDK's call if needed
        const streamingResp = await model.generateContentStream(requestBody);

        // accumulate whole returned text so we can parse JSON at the end
        let accumulated = "";

        // The SDK returns an async iterable / stream; iterate and collect parts
        for await (const chunk of streamingResp.stream) {
            // chunk shape varies by SDK; this attempts to read the usual shape
            const partText =
                chunk?.candidates?.[0]?.content?.parts?.[0]?.text ||
                chunk?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
            
            if (partText) {
                accumulated += partText;
                await onToken(partText);
            }
        }

        // when stream completes, `accumulated` should be the full JSON text (because you requested responseMimeType: application/json)
        const parsed = JSON.parse(accumulated);
        return {
            responseMessage: parsed.responseMessage,
            hasNewInfo: parsed.hasNewInfo,
        };
    } catch (err) {
        console.error("streamChatResponse error:", err);
        throw err;
    }
}