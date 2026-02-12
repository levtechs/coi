

import { Content, GenerationConfig, ThinkingConfig, Tool } from "@google/genai";

type MyPart = { text: string } | { inlineData: { data: string; mimeType: string } };

type MyContent = {
  role: string;
  parts: MyPart[];
};

type MyConfig = {
  generationConfig: GenerationConfig;
  thinkingConfig?: ThinkingConfig;
  tools?: Tool[];
};

type MyGenerateContentParameters = {
  model: string;
  contents: MyContent[];
  config: MyConfig;
};

import { ContentHierarchy, Card, Message, ChatAttachment, GroundingChunk, ChatPreferences, FileAttachment, TutorAction } from "@/lib/types"; // { content: string; isResponse: boolean }

import { getStringFromHierarchyAndCards, parseUnlockedCardsFromResponse } from "../helpers"

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
    onToken: (token: string) => Promise<void> | void,
    cardsToUnlock?: Card[],
    courseLesson?: { cardsToUnlock: Card[] }
): Promise<{ responseMessage: string; hasNewInfo: boolean; chatAttachments: ChatAttachment[]; followUpQuestions: string[]; unlockedCardIds: string[]; tutorActions: TutorAction[] } | null> {
    if (!message || message.trim() === "") throw new Error("Message is required.");

    // Process file attachments: fetch and add as inlineData
    const fileParts: MyPart[] = [];
    if (attachments) {
        const fileAttachments = attachments.filter((att): att is FileAttachment => 'type' in att && att.type === 'file');
        if (fileAttachments.length > 0) {
            const fetchPromises = fileAttachments.map(async (att) => {
                const response = await fetch(att.url);
                const arrayBuffer = await response.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                return {
                    inlineData: {
                        data: base64,
                        mimeType: att.mimeType,
                    },
                };
            });
            fileParts.push(...await Promise.all(fetchPromises));
        }
    }

    // Build contents array as Gemini expects: each content has role and parts (parts are objects with text)
    const contents = (messageHistory || [])
        .filter((m) => m.content && m.content.trim() !== "")
        .map((m) => ({
        role: m.isResponse ? "model" : "user",
        parts: [{ text: m.content }] as MyPart[],
        }));

    contents.push({
        role: "user",
        parts: [{ text: message }, ...fileParts] as MyPart[],
    });
    
    const prevContent = await ((previousContentHierarchy && previousCards) ? getStringFromHierarchyAndCards(previousCards, previousContentHierarchy) : null);
    if (prevContent) {
        contents.push({
            role: "user",
            parts: [{text: `EXISTING NOTES: ${JSON.stringify(prevContent)}`}]
        })
    }

    if (cardsToUnlock && cardsToUnlock.length > 0) {
        const cardsToUnlockList = cardsToUnlock.map(card => ({
            id: card.id,
            title: card.title,
            details: card.details
        }));
        contents.push({
            role: "user",
            parts: [{text: `CARDS AVAILABLE FOR UNLOCKING: ${JSON.stringify(cardsToUnlockList)}`}
            ]
        });
    }


    // systemInstruction as first content with role "user"
    const systemInstruction = { role: "user", parts: getChatResponseSystemInstruction(preferences.personality, preferences.googleSearch, preferences.followUpQuestions, cardsToUnlock, courseLesson).parts as MyPart[] }

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
        const selectedModel = getLLMModel(preferences.model, preferences.generationModel);

        const params: MyGenerateContentParameters = {
            model: selectedModel,
            contents: allContents,
            config,
        };

        const streamingResp = await genAI.models.generateContentStream(params);

        // accumulate whole returned text so we can parse JSON at the end
        let accumulated = "";
        const chatAttachments: ChatAttachment[] = [];
        const referencedCardIds: Set<string> = new Set();

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
                // Remove [HAS_NEW_INFO] and [ACTION]...[/ACTION] from streaming tokens to prevent them from appearing in UI
                let cleanToken = partText.replace(/\[HAS_NEW_INFO\]/g, '');
                cleanToken = cleanToken.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '');
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

        // Parse unlocked cards before removing the token
        const unlockedCardIds = parseUnlockedCardsFromResponse(accumulated);

        // Remove [UNLOCKED_CARDS] token from the response message (it's for backend processing only)
        responseMessage = responseMessage.replace(/\[UNLOCKED_CARDS\][^\n]*/, '').trim();

        // Parse tutor actions from response
        const tutorActions: TutorAction[] = [];
        const actionRegex = /\[ACTION\]([\s\S]*?)\[\/ACTION\]/g;
        let actionMatch;
        while ((actionMatch = actionRegex.exec(responseMessage)) !== null) {
            try {
                const action = JSON.parse(actionMatch[1].trim()) as TutorAction;
                tutorActions.push(action);
            } catch (e) {
                console.error("Failed to parse tutor action:", actionMatch[1], e);
            }
        }
        // Remove [ACTION]...[/ACTION] tokens from the response message
        responseMessage = responseMessage.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();

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

        // Parse card references and add them as chat attachments
        const cardRefRegex = /\(card:\s*([^)]+)\)/g;
        let match;
        while ((match = cardRefRegex.exec(responseMessage)) !== null) {
            const cardId = match[1].trim();
            referencedCardIds.add(cardId);
        }

        // Find referenced cards from previousCards and add them to chatAttachments
        if (previousCards && referencedCardIds.size > 0) {
            const referencedCards = previousCards.filter(card => referencedCardIds.has(card.id));
            chatAttachments.push(...referencedCards);
        }

        return {
            responseMessage,
            hasNewInfo,
            chatAttachments,
            followUpQuestions,
            unlockedCardIds,
            tutorActions,
        };
    } catch (err) {
        console.error("streamChatResponse error:", err);
        throw err;
    }
}
