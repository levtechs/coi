import { after } from "next/server";

import {
    executeTutorActions,
    generateNewHierarchyFromCards,
    groundingChunksToCardsAndWrite,
    unlockCards,
    writeChatPairToDb,
    writeHierarchy,
} from "@/app/api/chat/helpers";
import { copyCardsToDb, fetchCardsFromProject } from "@/app/api/cards/helpers";
import { getProjectById } from "@/app/api/projects/helpers";
import { Card, ChatAttachment, ContentHierarchy, GroundingChunk } from "@/lib/types";
import { buildFinalChatAttachments, resolveNewcardRefs } from "./shared";
import { StreamChatResponseResult } from "./types";

const SECONDARY_GENERATION_MODEL = "flash-lite" as const;

type BaseFinalizeArgs = {
    projectId: string;
    uid: string;
    message: string;
    attachments: ChatAttachment[] | null;
    response: StreamChatResponseResult;
    sendUpdate: (key: string, value: string, chatAttachments?: ChatAttachment[]) => void;
};

type ExistingProjectFinalizeArgs = BaseFinalizeArgs & {
    mode: "existing";
    previousContentHierarchy: ContentHierarchy | null;
    effectivePreviousCards: Card[];
    cardsToUnlock: Card[];
};

type QuickCreateFinalizeArgs = BaseFinalizeArgs & {
    mode: "quick-create";
};

type FinalizeArgs = ExistingProjectFinalizeArgs | QuickCreateFinalizeArgs;

export async function finalizeTaggedStream(args: FinalizeArgs): Promise<{
    finalResponseMessage: string;
    finalAttachments: ChatAttachment[];
    followUpQuestions: string[];
    allWrittenCards: Card[];
}> {
    const {
        projectId,
        uid,
        message,
        attachments,
        response,
        sendUpdate,
    } = args;

    const {
        responseMessage: chatResponseMessage,
        newCardsFromModel,
        writtenCards,
        chatAttachments,
        followUpQuestions,
    } = response;

    let finalResponseMessage = chatResponseMessage.replace(/\[cite:[^\]]*\]/g, "");
    const groundingChunks: GroundingChunk[] = chatAttachments.filter((a): a is GroundingChunk => "web" in a);
    const currentCardsForResources = await fetchCardsFromProject(projectId);
    const writtenResourceCards = groundingChunks.length > 0
        ? await groundingChunksToCardsAndWrite(projectId, currentCardsForResources, groundingChunks)
        : [];
    const allWrittenCards = [...writtenCards, ...writtenResourceCards];

    finalResponseMessage = resolveNewcardRefs(finalResponseMessage, allWrittenCards);
    const finalAttachments = buildFinalChatAttachments(chatAttachments, allWrittenCards, new Set<string>());

    sendUpdate("responseMessage", finalResponseMessage, finalAttachments);
    if (writtenResourceCards.length > 0) {
        sendUpdate("newCards", JSON.stringify(writtenResourceCards));
    }
    if (followUpQuestions.length > 0) {
        sendUpdate("followUpQuestions", JSON.stringify(followUpQuestions));
    }

    let backgroundCards = [...allWrittenCards];

    if (args.mode === "existing") {
        const { previousContentHierarchy, effectivePreviousCards, cardsToUnlock } = args;
        const { unlockedCardIds: parsedUnlockedCardIds, tutorActions } = response;

        let unlockedCards: Card[] = [];
        if (parsedUnlockedCardIds.length > 0 && cardsToUnlock.length > 0) {
            const existingCardIds = new Set((effectivePreviousCards || []).map((c) => c.id));
            unlockedCards = unlockCards(parsedUnlockedCardIds, cardsToUnlock, existingCardIds);
            if (unlockedCards.length > 0) {
                unlockedCards = unlockedCards.map((c) => ({ ...c, isUnlocked: true }));
                await copyCardsToDb(projectId, unlockedCards);
            }
        }

        if (unlockedCards.length > 0) {
            sendUpdate("newCards", JSON.stringify([...unlockedCards]));
        }

        if (tutorActions && tutorActions.length > 0) {
            try {
                const actionResult = await executeTutorActions(
                    tutorActions,
                    projectId,
                    previousContentHierarchy || { title: "", children: [] },
                    effectivePreviousCards,
                    SECONDARY_GENERATION_MODEL,
                );

                if (actionResult.modifiedHierarchy) {
                    await writeHierarchy(projectId, actionResult.modifiedHierarchy);
                    sendUpdate("newHierarchy", JSON.stringify(actionResult.modifiedHierarchy));
                }

                if (actionResult.deletedCardIds.length > 0) {
                    sendUpdate("deletedCards", JSON.stringify(actionResult.deletedCardIds));
                }
            } catch (actionErr) {
                console.error("Failed to execute tutor actions:", actionErr);
            }
        }

        backgroundCards = [...allWrittenCards, ...unlockedCards];
    }

    await writeChatPairToDb(message, attachments, finalResponseMessage, projectId, uid, finalAttachments, followUpQuestions);

    if (backgroundCards.length > 0) {
        after(async () => {
            try {
                if (args.mode === "existing") {
                    const currentCards = await fetchCardsFromProject(projectId);
                    const currentEffectiveCards = currentCards.filter((card) => !card.exclude && !card.labels?.includes("exclude from hierarchy"));
                    const currentProject = await getProjectById(projectId, uid);
                    const currentHierarchy = currentProject?.hierarchy || null;
                    const previousCardsForHierarchy = currentEffectiveCards.filter((c) => !backgroundCards.find((bc) => bc.id === c.id));
                    const hierarchyCards = backgroundCards.filter((c) => !c.exclude && !c.labels?.includes("exclude from hierarchy"));
                    const newHierarchy = await generateNewHierarchyFromCards(
                        currentHierarchy,
                        previousCardsForHierarchy,
                        hierarchyCards,
                        SECONDARY_GENERATION_MODEL,
                    );
                    if (newHierarchy) {
                        await writeHierarchy(projectId, newHierarchy);
                        console.info("[chat-stream] background hierarchy updated", { projectId, cardCount: hierarchyCards.length });
                    }
                } else {
                    const newHierarchy = await generateNewHierarchyFromCards(null, [], backgroundCards, SECONDARY_GENERATION_MODEL);
                    if (newHierarchy) {
                        await writeHierarchy(projectId, newHierarchy);
                        console.info("[quick-create] background hierarchy updated", { projectId, cardCount: backgroundCards.length });
                    }
                }
            } catch (bgErr) {
                console.error("Background job error:", bgErr);
            }
        });
    }

    return {
        finalResponseMessage,
        finalAttachments,
        followUpQuestions,
        allWrittenCards,
    };
}
