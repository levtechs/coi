import { GenerationConfig, ThinkingConfig, Tool } from "@google/genai";

import {
    ContentHierarchy,
    Card,
    Message,
    ChatAttachment,
    GroundingChunk,
    ChatPreferences,
    FileAttachment,
    TutorAction,
} from "@/lib/types";
import { getStringFromHierarchyAndCards } from "../helpers";
import { getLLMModel, getGenerationConfig, genAI } from "@/app/api/gemini/config";
import { getChatResponseSystemInstruction } from "../prompts";

type MyPart = { text: string } | { inlineData: { data: string; mimeType: string } };
type MyContent = { role: string; parts: MyPart[] };
type MyConfig = { generationConfig: GenerationConfig; thinkingConfig?: ThinkingConfig; tools?: Tool[] };
type MyGenerateContentParameters = { model: string; contents: MyContent[]; config: MyConfig };

const PRIMARY_CHAT_MODEL = "normal" as const;

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

type BlockTag = "NewCard" | "NewResourceCard" | "Prose" | "FollowUp" | "Action" | "UnlockCards";

type ActiveBlock = {
    tag: BlockTag;
    attrs: Record<string, string>;
    buffer: string;
};

function isPotentialPartialTopLevelTag(fragment: string): boolean {
    if (!fragment.startsWith("<")) return false;
    if (fragment === "<" || fragment === "</") return true;
    if (fragment.includes(">")) return false;

    const normalized = fragment.replace(/^<\/?/, "").toLowerCase();
    const nameMatch = normalized.match(/^[A-Za-z]*/);
    const partialName = nameMatch?.[0]?.toLowerCase() || "";
    if (!partialName) return true;

    const allowed: BlockTag[] = ["NewCard", "NewResourceCard", "Prose", "FollowUp", "Action", "UnlockCards"];
    return allowed.some((tag) => tag.toLowerCase().startsWith(partialName));
}

function stripJsonFences(jsonText: string): string {
    return jsonText.trim().replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim();
}

function extractTopLevelJsonObjects(text: string): string[] {
    const objects: string[] = [];
    let inString = false;
    let escaped = false;
    let depth = 0;
    let start = -1;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === "\\") {
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === "{") {
            if (depth === 0) start = i;
            depth += 1;
            continue;
        }

        if (char === "}") {
            depth -= 1;
            if (depth === 0 && start !== -1) {
                objects.push(text.slice(start, i + 1));
                start = -1;
            }
        }
    }

    return objects;
}

function parseSingleCardBody(jsonText: string): { title: string; details: string[] } | null {
    const trimmed = stripJsonFences(jsonText);
    try {
        const parsed = JSON.parse(trimmed) as { title?: unknown; details?: unknown };
        if (typeof parsed?.title !== "string") return null;
        const details = Array.isArray(parsed.details) ? parsed.details.filter((item): item is string => typeof item === "string") : [];
        return { title: parsed.title, details };
    } catch {
        try {
            const repaired = trimmed.replace(/,\s*([}\]])/g, "$1");
            const parsed = JSON.parse(repaired) as { title?: unknown; details?: unknown };
            if (typeof parsed?.title !== "string") return null;
            const details = Array.isArray(parsed.details) ? parsed.details.filter((item): item is string => typeof item === "string") : [];
            return { title: parsed.title, details };
        } catch (err) {
            console.error("Failed to parse card body", { jsonText: trimmed, err });
            return null;
        }
    }
}

function parseCardBodies(jsonText: string): Array<{ title: string; details: string[] }> {
    const trimmed = stripJsonFences(jsonText);
    const extractedObjects = extractTopLevelJsonObjects(trimmed);

    if (extractedObjects.length > 1) {
        const parsedCards = extractedObjects
            .map((objectText) => parseSingleCardBody(objectText))
            .filter((card): card is { title: string; details: string[] } => !!card);

        if (parsedCards.length > 0) {
            console.warn("Recovered multiple cards from a single card tag", {
                recovered: parsedCards.length,
                preview: trimmed.slice(0, 200),
            });
            return parsedCards;
        }
    }

    const single = parseSingleCardBody(trimmed);
    return single ? [single] : [];
}

function parseAttributes(rawAttrs: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(rawAttrs)) !== null) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

function parseResourceCards(body: string, attrs: Record<string, string>): ResourceCardSpec[] {
    const parsedBodies = parseCardBodies(body);
    const resultIndex = parseInt((attrs.resultIndex || "").trim(), 10);
    if (!Number.isInteger(resultIndex) || resultIndex <= 0) {
        console.warn("Dropped invalid resource card", { attrs });
        return [];
    }
    return parsedBodies.map((parsed) => ({
        tagType: "resource" as const,
        title: parsed.title,
        details: parsed.details,
        resultIndex,
    }));
}

function parseKnowledgeCards(body: string): KnowledgeCardSpec[] {
    return parseCardBodies(body).map((parsed) => ({
        tagType: "knowledge" as const,
        title: parsed.title,
        details: parsed.details,
    }));
}

function parseUnlockCards(body: string): string[] {
    return body
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function extractTaggedBodies(text: string, tagName: string): string[] {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`, "gi");
    const bodies: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        const body = match[1]?.trim();
        if (body) bodies.push(body);
    }
    return bodies;
}

function stripTransportTags(text: string): string {
    return text
        .replace(/<NewCard>[\s\S]*?<\/NewCard>/gi, "")
        .replace(/<NewResourceCard\b[^>]*>[\s\S]*?<\/NewResourceCard>/gi, "")
        .replace(/<FollowUp>[\s\S]*?<\/FollowUp>/gi, "")
        .replace(/<Action>[\s\S]*?<\/Action>/gi, "")
        .replace(/<UnlockCards>[\s\S]*?<\/UnlockCards>/gi, "")
        .replace(/<CardRef\b[^>]*\/>/gi, "")
        .replace(/<NewCardRef\b[^>]*\/>/gi, "")
        .trim();
}

function maybeWaitForCardWrites(writePromise: Promise<void> | null): Promise<void> {
    return writePromise ?? Promise.resolve();
}

export async function streamChatResponse(
    message: string,
    messageHistory: Message[],
    previousCards: Card[] | null,
    previousContentHierarchy: ContentHierarchy | null,
    attachments: null | ChatAttachment[],
    preferences: ChatPreferences,
    onToken: (token: string) => Promise<void> | void,
    onNewCards?: (cards: ModelCard[]) => Promise<Card[]>,
    cardsToUnlock?: Card[],
    courseLesson?: { cardsToUnlock: Card[] }
): Promise<{
    responseMessage: string;
    newCardsFromModel: ModelCard[];
    writtenCards: Card[];
    chatAttachments: ChatAttachment[];
    followUpQuestions: string[];
    unlockedCardIds: string[];
    tutorActions: TutorAction[];
}> {
    if (!message || message.trim() === "") throw new Error("Message is required.");

    const fileParts: MyPart[] = [];
    if (attachments) {
        const fileAttachments = attachments.filter((att): att is FileAttachment => "type" in att && att.type === "file");
        if (fileAttachments.length > 0) {
            const uploaded = await Promise.all(
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
            fileParts.push(...uploaded);
        }
    }

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
        parts: getChatResponseSystemInstruction(preferences.personality, preferences.googleSearch, preferences.followUpQuestions, cardsToUnlock, courseLesson).parts as MyPart[],
    };

    const allContents = [systemInstruction, ...contents];
    const shouldUseSearch = preferences.googleSearch !== "disable";
    const selectedModel = getLLMModel(PRIMARY_CHAT_MODEL);
    const params: MyGenerateContentParameters = {
        model: selectedModel,
        contents: allContents,
        config: {
            generationConfig: {
                ...getGenerationConfig(PRIMARY_CHAT_MODEL),
                responseMimeType: "text/plain",
            },
            thinkingConfig: {
                thinkingBudget: preferences.thinking === "off" ? 0 : (preferences.thinking === "force" ? 16384 : -1),
                includeThoughts: true,
            },
            ...(shouldUseSearch && { tools: [{ googleSearch: {} }] }),
        },
    };

    const streamingResp = await genAI.models.generateContentStream(params);

    const chatAttachments: ChatAttachment[] = [];
    const referencedCardIds = new Set<string>();
    const thoughtSummaries: string[] = [];
    let totalThoughtTime = 0;

    const parsedCards: ModelCard[] = [];
    const writtenCards: Card[] = [];
    const followUpQuestions: string[] = [];
    const unlockedCardIds: string[] = [];
    const tutorActions: TutorAction[] = [];
    let responseMessage = "";

    let pending = "";
    let activeBlock: ActiveBlock | null = null;
    let cardWritePromise: Promise<void> | null = null;
    let accumulatedRaw = "";

    const flushParsedCards = async () => {
        const alreadyWrittenTitles = new Set(writtenCards.map((card) => card.title));
        const pendingCards = parsedCards.filter((card) => !alreadyWrittenTitles.has(card.title));
        if (pendingCards.length === 0 || !onNewCards) return;
        cardWritePromise = (async () => {
            const newlyWritten = await onNewCards(pendingCards);
            writtenCards.push(...newlyWritten);
        })();
        await cardWritePromise;
    };

    const resolveNewCardTitle = (title: string): string => {
        const card = writtenCards.find((item) => item.title === title);
        return card ? `(card: ${card.id})` : title;
    };

    const replaceInlineRefs = (text: string): string => {
        let output = text;
        output = output.replace(/<NewCardRef\s+title="([^"]+)"\s*\/>/gi, (_match, title: string) => resolveNewCardTitle(title));
        output = output.replace(/<CardRef\s+id="([^"]+)"\s*\/>/gi, (_match, id: string) => `(card: ${id})`);
        output = output.replace(/<\/?FollowUp>/gi, "");
        output = output.replace(/<\/?Action>/gi, "");
        output = output.replace(/<\/?UnlockCards>/gi, "");
        output = output.replace(/<\/?Prose>/gi, "");
        return output;
    };

    const emitLooseText = async (text: string) => {
        const rendered = replaceInlineRefs(text);
        if (!rendered) return;
        responseMessage += rendered;
        await onToken(rendered);
    };

    const processProseBuffer = async (flushAll = false): Promise<boolean> => {
        if (!activeBlock || activeBlock.tag !== "Prose") return false;

        while (activeBlock.buffer.length > 0) {
            const ltIndex = activeBlock.buffer.indexOf("<");

            if (ltIndex === -1) {
                await emitLooseText(activeBlock.buffer);
                activeBlock.buffer = "";
                return false;
            }

            if (ltIndex > 0) {
                const plain = activeBlock.buffer.slice(0, ltIndex);
                await emitLooseText(plain);
                activeBlock.buffer = activeBlock.buffer.slice(ltIndex);
                continue;
            }

            const proseCloseMatch = activeBlock.buffer.match(/^<\/Prose>/i);
            if (proseCloseMatch) {
                pending = activeBlock.buffer.slice(proseCloseMatch[0].length) + pending;
                activeBlock = null;
                return true;
            }

            if (!flushAll && activeBlock.buffer.startsWith("<") && !activeBlock.buffer.includes(">")) {
                return false;
            }

            const cardRefMatch = activeBlock.buffer.match(/^<CardRef\s+id="([^"]+)"\s*\/>/i);
            if (cardRefMatch) {
                const resolved = `(card: ${cardRefMatch[1]})`;
                responseMessage += resolved;
                await onToken(resolved);
                activeBlock.buffer = activeBlock.buffer.slice(cardRefMatch[0].length);
                continue;
            }

            const newCardRefMatch = activeBlock.buffer.match(/^<NewCardRef\s+title="([^"]+)"\s*\/>/i);
            if (newCardRefMatch) {
                const resolved = resolveNewCardTitle(newCardRefMatch[1]);
                responseMessage += resolved;
                await onToken(resolved);
                activeBlock.buffer = activeBlock.buffer.slice(newCardRefMatch[0].length);
                continue;
            }

            const nextTopLevelTag = findOpenTag(activeBlock.buffer);
            if (nextTopLevelTag && nextTopLevelTag.index === 0) {
                console.warn("Implicitly closing <Prose> before next top-level tag", { nextTag: nextTopLevelTag.tag });
                pending = activeBlock.buffer + pending;
                activeBlock = null;
                return true;
            }

            responseMessage += "<";
            await onToken("<");
            activeBlock.buffer = activeBlock.buffer.slice(1);
        }

        return false;
    };

    const handleClosedBlock = async (block: ActiveBlock) => {
        if (block.tag === "NewCard") {
            const parsed = parseKnowledgeCards(block.buffer);
            if (parsed.length > 0) parsedCards.push(...parsed);
            return;
        }
        if (block.tag === "NewResourceCard") {
            const parsed = parseResourceCards(block.buffer, block.attrs);
            if (parsed.length > 0) parsedCards.push(...parsed);
            return;
        }
        if (block.tag === "FollowUp") {
            const question = block.buffer.trim();
            if (question) followUpQuestions.push(question);
            return;
        }
        if (block.tag === "Action") {
            const actionText = block.buffer.trim();
            if (!actionText) return;
            try {
                tutorActions.push(JSON.parse(actionText) as TutorAction);
            } catch (err) {
                console.error("Failed to parse <Action>", { actionText, err });
            }
            return;
        }
        if (block.tag === "UnlockCards") {
            unlockedCardIds.push(...parseUnlockCards(block.buffer));
        }
    };

    const findOpenTag = (buffer: string): { index: number; tag: BlockTag; raw: string; attrs: Record<string, string> } | null => {
        const ltIndex = buffer.indexOf("<");
        if (ltIndex === -1) return null;

        const remainder = buffer.slice(ltIndex);
        const tags: Array<{ tag: BlockTag; regex: RegExp }> = [
            { tag: "NewCard", regex: /^<NewCard>/i },
            { tag: "Prose", regex: /^<Prose>/i },
            { tag: "FollowUp", regex: /^<FollowUp>/i },
            { tag: "Action", regex: /^<Action>/i },
            { tag: "UnlockCards", regex: /^<UnlockCards>/i },
            { tag: "NewResourceCard", regex: /^<NewResourceCard\b([^>]*)>/i },
        ];

        for (const candidate of tags) {
            const match = remainder.match(candidate.regex);
            if (!match) continue;
            return {
                index: ltIndex,
                tag: candidate.tag,
                raw: match[0],
                attrs: candidate.tag === "NewResourceCard" ? parseAttributes(match[1] || "") : {},
            };
        }

        return null;
    };

    for await (const chunk of streamingResp) {
        const parts = chunk?.candidates?.[0]?.content?.parts || [];
        let partText = "";

        for (const part of parts) {
            if (!part.text) continue;
            if (part.thought) {
                thoughtSummaries.push(part.text);
                const timeMatch = part.text.match(/Thought for (\d+) secs/);
                if (timeMatch) totalThoughtTime += parseInt(timeMatch[1]);
            } else {
                partText += part.text;
            }
        }

        const metadata = (chunk as { candidates?: { groundingMetadata?: { groundingChunks?: GroundingChunk[] } }[] })?.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks) {
            chatAttachments.push(...metadata.groundingChunks);
        }

        if (!partText) continue;
        accumulatedRaw += partText;
        pending += partText;

        while (pending.length > 0) {
            if (activeBlock?.tag === "Prose") {
                activeBlock.buffer += pending;
                pending = "";
                const proseClosed = await processProseBuffer(false);
                if (!proseClosed) break;
                continue;
            }

            if (activeBlock) {
                const combined = activeBlock.buffer + pending;
                const closingTag = `</${activeBlock.tag.toLowerCase()}>`;
                const endIdx = combined.toLowerCase().indexOf(closingTag);
                if (endIdx === -1) {
                    activeBlock.buffer += pending;
                    pending = "";
                    break;
                }

                activeBlock.buffer = combined.slice(0, endIdx);
                pending = combined.slice(endIdx + closingTag.length);
                const closed = activeBlock;
                activeBlock = null;
                await handleClosedBlock(closed);
                continue;
            }

            const openTag = findOpenTag(pending);
            if (!openTag) {
                const lastLt = pending.lastIndexOf("<");
                if (lastLt !== -1) {
                    const trailing = pending.slice(lastLt);
                    if (isPotentialPartialTopLevelTag(trailing)) {
                        const before = pending.slice(0, lastLt);
                        if (before.trim().length > 0) {
                            await emitLooseText(before);
                        }
                        pending = trailing;
                        break;
                    }
                }

                if (pending.trim().length > 0) {
                    await emitLooseText(pending);
                }
                pending = "";
                break;
            }

            const beforeTag = pending.slice(0, openTag.index);
            if (beforeTag.trim().length > 0) {
                await emitLooseText(beforeTag);
            }

            pending = pending.slice(openTag.index + openTag.raw.length);

            if (openTag.tag === "Prose") {
                await maybeWaitForCardWrites(cardWritePromise);
            }

            if (openTag.tag === "NewCard" || openTag.tag === "NewResourceCard") {
                activeBlock = { tag: openTag.tag, attrs: openTag.attrs, buffer: "" };
                continue;
            }

            if (openTag.tag === "Prose") {
                await flushParsedCards();
                activeBlock = { tag: "Prose", attrs: {}, buffer: "" };
                continue;
            }

            activeBlock = { tag: openTag.tag, attrs: openTag.attrs, buffer: "" };
        }
    }

    if (activeBlock?.tag === "Prose") {
        await processProseBuffer(true);
    }

    if (activeBlock && activeBlock.tag !== "Prose") {
        console.warn("Stream ended with unclosed tag", { tag: activeBlock.tag });
    }

    await flushParsedCards();
    await maybeWaitForCardWrites(cardWritePromise);

    // Safety net: if follow-up tags were missed by the streaming state machine,
    // recover them from the raw output so they still appear in the UI.
    const recoveredFollowUps = extractTaggedBodies(accumulatedRaw, "FollowUp");
    for (const question of recoveredFollowUps) {
        if (!followUpQuestions.includes(question)) {
            followUpQuestions.push(question);
        }
    }

    if (thoughtSummaries.length > 0) {
        const combinedSummary = thoughtSummaries.join("\n\n");
        chatAttachments.push({ title: `Thought for ${totalThoughtTime} seconds`, summary: combinedSummary, time: totalThoughtTime });
    }

    const cardRefRegex = /\(card:\s*([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = cardRefRegex.exec(responseMessage)) !== null) {
        const inner = match[1].trim();
        const refs = inner.split(/,\s*card:\s*/);
        for (const ref of refs) referencedCardIds.add(ref.trim());
    }

    if (previousCards && referencedCardIds.size > 0) {
        const referencedCards = previousCards.filter((card) => referencedCardIds.has(card.id));
        chatAttachments.push(...referencedCards);
    }

    console.info("[chat-stream] parse summary", {
        rawPreview: accumulatedRaw.slice(0, 300),
        parsedCards: parsedCards.length,
        parsedResourceCards: parsedCards.filter((card) => card.tagType === "resource").length,
        writtenCards: writtenCards.length,
        groundingChunks: chatAttachments.filter((a) => "web" in a).length,
        followUpQuestions: followUpQuestions.length,
        actions: tutorActions.length,
        unlocks: unlockedCardIds.length,
    });

    return {
        responseMessage: stripTransportTags(responseMessage),
        newCardsFromModel: parsedCards,
        writtenCards,
        chatAttachments,
        followUpQuestions,
        unlockedCardIds,
        tutorActions,
    };
}
