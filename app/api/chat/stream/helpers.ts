import { Card } from "@/lib/types/cards";
import { Message, ChatAttachment, GroundingChunk, ChatPreferences } from "@/lib/types/chat";
import { ContentHierarchy, TutorAction } from "@/lib/types/content";
import { FileAttachment } from "@/lib/types/uploads";
import { genAI } from "@/app/api/gemini/config";
import { buildStreamChatRequest } from "./model_request";
import { stripTransportTags } from "./prose_helpers";
import { createActiveBlock, extractTaggedBodies, findOpenTag, isPotentialPartialTopLevelTag, parseKnowledgeCards, parseResourceCards, parseUnlockCards } from "./tag_parsing";
import { ActiveBlock, ModelCard, StreamChatResponseResult } from "./types";

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
): Promise<StreamChatResponseResult> {
    if (!message || message.trim() === "") throw new Error("Message is required.");
    const params = await buildStreamChatRequest(
        message,
        messageHistory,
        previousCards,
        previousContentHierarchy,
        attachments,
        preferences,
        cardsToUnlock,
        courseLesson,
    );

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
        if (!card) return title;
        return `(card: ${card.id})`;
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
