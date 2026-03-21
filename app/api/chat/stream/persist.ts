import { writeCardsToDb } from "@/app/api/cards/helpers";
import { Card } from "@/lib/types/cards";
import { ChatAttachment } from "@/lib/types/chat";
import { ModelCard } from "./types";

export function persistModelCards(
    projectId: string,
    sendUpdate: (key: string, value: string, chatAttachments?: ChatAttachment[]) => void,
) {
    return async (modelCards: ModelCard[]): Promise<Card[]> => {
        const cardsToWrite = modelCards
            .filter((modelCard) => modelCard.tagType === "knowledge")
            .map((modelCard) => ({
                title: modelCard.title,
                details: modelCard.details,
                kind: "note" as const,
            }));
        if (cardsToWrite.length === 0) {
            return [];
        }
        const written = await writeCardsToDb(projectId, cardsToWrite);
        sendUpdate("newCards", JSON.stringify(written));
        return written;
    };
}
