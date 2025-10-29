

import { Content, GenerationConfig, ThinkingConfig, Tool } from "@google/genai";

type MyConfig = {
  generationConfig: GenerationConfig;
  thinkingConfig?: ThinkingConfig;
  tools?: Tool[];
};

type MyGenerateContentParameters = {
  model: string;
  contents: Content[];
  config: MyConfig;
};

import { ContentHierarchy, Card, Message, ChatAttachment, GroundingChunk, ChatPreferences } from "@/lib/types"; // { content: string; isResponse: boolean }

import { getStringFromHierarchyAndCards } from "../helpers"

import {
    getLLMModel,
    getGenerationConfig,
    genAI,
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
    startTime: number,
    onToken: (token: string) => Promise<void> | void
): Promise<{ responseMessage: string; hasNewInfo: boolean; chatAttachments: ChatAttachment[]; followUpQuestions: string[] } | null> {
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
    const systemInstruction = { role: "user", parts: getChatResponseSystemInstruction(preferences.personality, preferences.googleSearch, preferences.followUpQuestions).parts }

    // Include systemInstruction at the beginning of contents
    const allContents = [systemInstruction, ...contents];

    // Include Google Search tool based on preferences (always for force/auto, never for disable)
    const shouldUseSearch = preferences.googleSearch !== "disable";

    const config = {
        generationConfig: {
            ...getGenerationConfig(preferences.model),
            responseMimeType: "text/plain",
        },
        thinkingConfig: {
            thinkingBudget: preferences.thinking === "off" ? 0 : (preferences.thinking === "force" ? 16384 : -1),
            includeThoughts: true,
        },
        ...(shouldUseSearch && { tools: [{ googleSearch: {} }] }),
    };

    try {
        // Get the appropriate model based on preferences
        const selectedModel = getLLMModel(preferences.model);

        const params: MyGenerateContentParameters = {
            model: selectedModel,
            contents: allContents as Content[],
            config,
        };

        const streamingResp = await genAI.models.generateContentStream(params);

        // accumulate whole returned text so we can parse JSON at the end
        let accumulated = "";
        const chatAttachments: ChatAttachment[] = [];

        const thoughtSummaries: string[] = [];
        let totalThoughtTime = 0;

        // The SDK returns an async iterable / stream; iterate and collect parts
        for await (const chunk of streamingResp) {
            const parts = chunk?.candidates?.[0]?.content?.parts || [];
            let partText = "";

            for (const part of parts) {
                if (part.text) {
                    if (part.thought) {
                        thoughtSummaries.push(part.text);
                        const timeMatch = part.text.match(/Thought for (\d+) secs/);
                        if (timeMatch) {
                            totalThoughtTime += parseInt(timeMatch[1]);
                        }
                    } else {
                        partText += part.text;
                    }
                }
            }

            // Collect grounding chunks as chat attachments
            const metadata = (chunk as { candidates?: { groundingMetadata?: { groundingChunks?: GroundingChunk[] } }[] })?.candidates?.[0]?.groundingMetadata;
            if (metadata?.groundingChunks) {
                chatAttachments.push(...metadata.groundingChunks);
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

        // Add single thinking attachment if any thoughts
        if (thoughtSummaries.length > 0) {
            const combinedSummary = thoughtSummaries.join('\n\n');
            chatAttachments.push({ title: `Thought for ${totalThoughtTime} seconds`, summary: combinedSummary, time: totalThoughtTime });
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
            chatAttachments,
            followUpQuestions,
        };
    } catch (err) {
        console.error("streamChatResponse error:", err);
        throw err;
    }
}
