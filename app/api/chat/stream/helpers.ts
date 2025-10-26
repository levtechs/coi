

import {
    GenerateContentRequest,
} from "@google/generative-ai";

type ExtendedGenerateContentRequest = GenerateContentRequest & {
    tools?: { googleSearch: Record<string, never> }[];
};

import { ContentHierarchy, Card, Message, ChatAttachment, GroundingChunk, ChatPreferences } from "@/lib/types"; // { content: string; isResponse: boolean }

import { getStringFromHierarchyAndCards } from "../helpers"

import {
    getLLMModel,
    getGenerationConfig,
} from "@/app/api/gemini/config";
import {
    getChatResponseSystemInstruction,
} from "../prompts"

/**
 * Streams a Gemini chat response. Calls onToken(token) for each text chunk received.
 * Returns the response message with hasNewInfo detected from the token.
 */
export async function streamChatResponse(
    message: string,
    messageHistory: Message[],
    previousCards: Card[] | null,
    previousContentHierarchy: ContentHierarchy | null,
    attachments: null | ChatAttachment[],
    preferences: ChatPreferences,
    onToken: (token: string) => Promise<void> | void
): Promise<{ responseMessage: string; hasNewInfo: boolean; groundingChunks: GroundingChunk[] } | null> {
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
    // systemInstruction must be a Content object with a role
    const systemInstruction = { role: "system", parts: getChatResponseSystemInstruction(preferences.personality, preferences.googleSearch).parts }

    // Include Google Search tool based on preferences (always for force/auto, never for disable)
    const shouldUseSearch = preferences.googleSearch !== "disable";

    const requestBody: ExtendedGenerateContentRequest = {
        contents,
        systemInstruction,
        generationConfig: {
            ...getGenerationConfig(preferences.model),
            responseMimeType: "text/plain",
        },
        ...(shouldUseSearch && { tools: [{ googleSearch: {} }] }),
    };

    try {
        // Get the appropriate model based on preferences
        const selectedModel = getLLMModel(preferences.model);

        // NOTE: cast to any to avoid SDK typing mismatches — adapt to your SDK's call if needed
        const streamingResp = await selectedModel.generateContentStream(requestBody);

        // accumulate whole returned text so we can parse JSON at the end
        let accumulated = "";
        const groundingChunks: GroundingChunk[] = [];

        // The SDK returns an async iterable / stream; iterate and collect parts
        for await (const chunk of streamingResp.stream) {
            // chunk shape varies by SDK; this attempts to read the usual shape
            const partText =
                chunk?.candidates?.[0]?.content?.parts?.[0]?.text ||
                chunk?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

            // Collect grounding chunks
            const metadata = (chunk as { candidates?: { groundingMetadata?: { groundingChunks?: GroundingChunk[] } }[] })?.candidates?.[0]?.groundingMetadata;
            if (metadata?.groundingChunks) {
                groundingChunks.push(...metadata.groundingChunks);
            }

            if (partText) {
                accumulated += partText;
                await onToken(partText);
            }
        }

        // Detect hasNewInfo from token, but override based on preferences
        let responseMessage = accumulated.trim();
        let hasNewInfo = responseMessage.includes("[HAS_NEW_INFO]");
        responseMessage = responseMessage.replace(/\[HAS_NEW_INFO\]/g, '').trim();

        // Override hasNewInfo based on forceCardCreation preference
        if (preferences.forceCardCreation === "on") {
            hasNewInfo = true;
        } else if (preferences.forceCardCreation === "off") {
            hasNewInfo = false;
        }
        // If "auto", keep the original hasNewInfo detection

        return {
            responseMessage,
            hasNewInfo,
            groundingChunks,
        };
    } catch (err) {
        console.error("streamChatResponse error:", err);
        throw err;
    }
}
