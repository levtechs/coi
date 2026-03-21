import { GenerationConfig, ThinkingConfig, Tool } from "@google/genai";

import {
    Card,
    ChatAttachment,
    TutorAction,
} from "@/lib/types";

export type MyPart = { text: string } | { inlineData: { data: string; mimeType: string } };
export type MyContent = { role: string; parts: MyPart[] };
export type MyConfig = { generationConfig: GenerationConfig; thinkingConfig?: ThinkingConfig; tools?: Tool[] };
export type MyGenerateContentParameters = { model: string; contents: MyContent[]; config: MyConfig };

export type KnowledgeCardSpec = {
    tagType: "knowledge";
    title: string;
    details: string[];
};

export type ResourceCardSpec = {
    tagType: "resource";
    title: string;
    details: string[];
    resultIndex: number;
};

export type ModelCard = KnowledgeCardSpec | ResourceCardSpec;

export type StreamChatResponseResult = {
    responseMessage: string;
    newCardsFromModel: ModelCard[];
    writtenCards: Card[];
    chatAttachments: ChatAttachment[];
    followUpQuestions: string[];
    unlockedCardIds: string[];
    tutorActions: TutorAction[];
};

export type BlockTag = "NewCard" | "NewResourceCard" | "Prose" | "FollowUp" | "Action" | "UnlockCards";

export type ActiveBlock = {
    tag: BlockTag;
    attrs: Record<string, string>;
    buffer: string;
};
