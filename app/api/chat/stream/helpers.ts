

import { ContentHierarchy, Card, Message, ChatAttachment } from "@/lib/types"; // { content: string; isResponse: boolean }

import { getStringFromHierarchyAndCards } from "../helpers"

import { 
    limitedGeneralConfig,
    llmModel,
} from "@/app/api/gemini/config";
import {
    chatResponseSystemInstruction, 
    //  === \/ below is depricated \/ 
    firstChatResponseSystemInstruction, 
} from "../prompts"

/**
 * Streams a Gemini chat response. Calls onToken(token) for each text chunk received.
 * Returns parsed final JSON (responseMessage, hasNewInfo) once streaming completes.
 */
export async function streamChatResponse(
    message: string,
    messageHistory: Message[],
    previousCards: Card[] | null,
    previousContentHierarchy: ContentHierarchy | null,
    attachments: null | ChatAttachment[],
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
    
    const prevContent = await ((previousContentHierarchy && previousCards) ? getStringFromHierarchyAndCards(previousCards, previousContentHierarchy) : null);
    if (prevContent) {
        contents.push({
            role: "user",
            parts: [{text: `EXISTING NOTES: ${JSON.stringify(prevContent)}`}]
        })
    }

    if (attachments) {
        contents.push({
            role: "user",
            parts: [{text: `CHAT ATTACHMENTS: ${JSON.stringify(attachments)}`}]
        })
    }
    // systemInstruction must be a Con;tent object with a role
    const systemInstruction = { role: "system", parts: chatResponseSystemInstruction.parts }

    const requestBody = {
        contents,
        systemInstruction,
        generationConfig: {
            ...limitedGeneralConfig,
            responseMimeType: "text/plain",
        },
        tools: [{ googleSearch: {} }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    try {
        // NOTE: cast to any to avoid SDK typing mismatches — adapt to your SDK's call if needed
        const streamingResp = await llmModel.generateContentStream(requestBody);

        // accumulate whole returned text so we can parse JSON at the end
        let accumulated = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groundingChunks: any[] = [];

        // The SDK returns an async iterable / stream; iterate and collect parts
        for await (const chunk of streamingResp.stream) {
            // chunk shape varies by SDK; this attempts to read the usual shape
            const partText =
                chunk?.candidates?.[0]?.content?.parts?.[0]?.text ||
                chunk?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

            // Collect grounding chunks
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const metadata = (chunk as any)?.candidates?.[0]?.groundingMetadata;
            if (metadata?.groundingChunks) {
                groundingChunks.push(...metadata.groundingChunks);
            }

            if (partText) {
                accumulated += partText;
                await onToken(partText);
            }
        }

        // when stream completes, accumulated may contain plain text followed by JSON
        let parsed;
        let jsonText = accumulated.trim();

        // Try to extract JSON from the end
        const jsonStart = jsonText.lastIndexOf('{');
        if (jsonStart !== -1) {
            const potentialJson = jsonText.substring(jsonStart);
            try {
                parsed = JSON.parse(potentialJson);
                // If successful, the plain text before is the response
                const plainText = jsonText.substring(0, jsonStart).trim();
                if (plainText) {
                    parsed.responseMessage = plainText;
                }
            } catch (err) {
                // Not valid JSON at end
            }
        }

        if (!parsed) {
            // Check for markdown
            if (jsonText.startsWith('```json') && jsonText.endsWith('```')) {
                jsonText = jsonText.slice(7, -3).trim();
                try {
                    parsed = JSON.parse(jsonText);
                } catch (err) {
                    // Ignore
                }
            }
        }

        if (!parsed) {
            // Fallback to plain text
            parsed = { responseMessage: jsonText, hasNewInfo: false };
        }

        // Append sources if available
        if (groundingChunks.length > 0) {
            const uniqueChunks = Array.from(new Set(groundingChunks.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sources = uniqueChunks.map((c: any) => `- ${c.web.title}: ${c.web.uri}`).join('\n');
            parsed.responseMessage += `\n\nSources:\n${sources}`;
        }

        return {
            responseMessage: parsed.responseMessage,
            hasNewInfo: parsed.hasNewInfo || false,
        };
    } catch (err) {
        console.error("streamChatResponse error:", err);
        throw err;
    }
}