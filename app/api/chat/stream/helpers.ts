

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
): Promise<{ responseMessage: string; hasNewInfo: boolean; groundingChunks: GroundingChunk[]; followUpQuestions: string[] } | null> {
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
    const systemInstruction = { role: "system", parts: getChatResponseSystemInstruction(preferences.personality, preferences.googleSearch, preferences.followUpQuestions).parts }


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
                // Remove [HAS_NEW_INFO] from streaming tokens to prevent it from appearing in UI
                const cleanToken = partText.replace(/\[HAS_NEW_INFO\]/g, '');
                accumulated += partText; // Keep original for parsing
                if (cleanToken) {
                    await onToken(cleanToken);
                }
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

        // Parse follow-up questions if enabled
        const followUpQuestions: string[] = [];
        if (preferences.followUpQuestions === "auto") {
            console.log("Full response message before parsing follow-ups:", responseMessage);
            // Find the position of the first [FOLLOW_UP]
            const followUpIndex = responseMessage.indexOf('[FOLLOW_UP]');
            if (followUpIndex !== -1) {
                // Extract the main response (everything before [FOLLOW_UP])
                const mainResponse = responseMessage.substring(0, followUpIndex).trim();
                const followUpPart = responseMessage.substring(followUpIndex);

                // Parse follow-up questions from the followUpPart
                const followUpRegex = /\[FOLLOW_UP\]\s*([\s\S]*?)(?=\[FOLLOW_UP\]|$)/g;
                let match;
                while ((match = followUpRegex.exec(followUpPart)) !== null) {
                    const question = match[1].trim();
                    if (question) {
                        followUpQuestions.push(question);
                    }
                }

                // Update responseMessage to only contain the main response
                responseMessage = mainResponse;
            }
        }

        return {
            responseMessage,
            hasNewInfo,
            groundingChunks,
            followUpQuestions,
        };
    } catch (err) {
        console.error("streamChatResponse error:", err);
        throw err;
    }
}
