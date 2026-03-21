import { GenerationConfig, ThinkingConfig, Tool } from "@google/genai";

import {
    Card,
    ChatAttachment,
    ChatPreferences,
    ContentHierarchy,
    FileAttachment,
    Message,
} from "@/lib/types";
import { getStringFromHierarchyAndCards } from "../helpers";
import { getGenerationConfig, getLLMModel } from "@/app/api/gemini/config";
import { getChatResponseSystemInstruction } from "../prompts";
import { MyContent, MyGenerateContentParameters, MyPart } from "./types";

const PRIMARY_CHAT_MODEL = "normal" as const;

async function buildInlineFileParts(attachments: null | ChatAttachment[]): Promise<MyPart[]> {
    if (!attachments) return [];

    const fileAttachments = attachments.filter((att): att is FileAttachment => "type" in att && att.type === "file");
    if (fileAttachments.length === 0) return [];

    return Promise.all(
        fileAttachments.map(async (att) => {
            const response = await fetch(att.url);
            const arrayBuffer = await response.arrayBuffer();
            return {
                inlineData: {
                    data: Buffer.from(arrayBuffer).toString("base64"),
                    mimeType: att.mimeType,
                },
            } as MyPart;
        }),
    );
}

function buildConversationContents(messageHistory: Message[], message: string, fileParts: MyPart[]): MyContent[] {
    const contents = (messageHistory || [])
        .filter((m) => m.content && m.content.trim() !== "")
        .map((m) => ({
            role: m.isResponse ? "model" : "user",
            parts: [{ text: m.content }] as MyPart[],
        }));

    contents.push({
        role: "user",
        parts: [{ text: message }, ...fileParts],
    });

    return contents;
}

export async function buildStreamChatRequest(
    message: string,
    messageHistory: Message[],
    previousCards: Card[] | null,
    previousContentHierarchy: ContentHierarchy | null,
    attachments: null | ChatAttachment[],
    preferences: ChatPreferences,
    cardsToUnlock?: Card[],
    courseLesson?: { cardsToUnlock: Card[] },
): Promise<MyGenerateContentParameters> {
    const fileParts = await buildInlineFileParts(attachments);
    const contents = buildConversationContents(messageHistory, message, fileParts);

    const prevContent = await ((previousContentHierarchy && previousCards) ? getStringFromHierarchyAndCards(previousCards, previousContentHierarchy) : null);
    if (prevContent) {
        contents.push({
            role: "user",
            parts: [{ text: `EXISTING NOTES: ${JSON.stringify(prevContent)}` }],
        });
    }

    if (cardsToUnlock && cardsToUnlock.length > 0) {
        const cardsToUnlockList = cardsToUnlock.map((card) => ({ id: card.id, title: card.title, details: card.details }));
        contents.push({
            role: "user",
            parts: [{ text: `CARDS AVAILABLE FOR UNLOCKING: ${JSON.stringify(cardsToUnlockList)}` }],
        });
    }

    const systemInstruction = {
        role: "user",
        parts: getChatResponseSystemInstruction(
            preferences.personality,
            preferences.googleSearch,
            preferences.followUpQuestions,
            cardsToUnlock,
            courseLesson,
        ).parts as MyPart[],
    };

    const allContents = [systemInstruction, ...contents];
    const shouldUseSearch = preferences.googleSearch !== "disable";
    const selectedModel = getLLMModel(PRIMARY_CHAT_MODEL);

    return {
        model: selectedModel,
        contents: allContents,
        config: {
            generationConfig: {
                ...(getGenerationConfig(PRIMARY_CHAT_MODEL) as GenerationConfig),
                responseMimeType: "text/plain",
            },
            thinkingConfig: {
                thinkingBudget: preferences.thinking === "off" ? 0 : (preferences.thinking === "force" ? 16384 : -1),
                includeThoughts: true,
            } as ThinkingConfig,
            ...(shouldUseSearch && { tools: [{ googleSearch: {} }] as Tool[] }),
        },
    };
}
