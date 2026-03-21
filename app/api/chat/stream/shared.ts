import { Card, ChatAttachment, GroundingChunk } from "@/lib/types";

export function resolveNewcardRefs(response: string, writtenCards: Card[]): string {
    let resolved = response;
    resolved = resolved.replace(/<NewCardRef\s+title="([^"]+)"\s*\/>/gi, (_match, title: string) => {
        const card = writtenCards.find((item) => item.title === title);
        return card ? `(card: ${card.id})` : title;
    });
    resolved = resolved.replace(/<CardRef\s+id="([^"]+)"\s*\/>/gi, (_match, id: string) => `(card: ${id})`);
    resolved = resolved.replace(/<NewCardRef\b[^>]*\/>/gi, "");
    resolved = resolved.replace(/<CardRef\b[^>]*\/>/gi, "");
    return resolved;
}

export function buildFinalChatAttachments(
    chatAttachments: ChatAttachment[],
    writtenCards: Card[],
    _usedChunkUris: Set<string>,
): ChatAttachment[] {
    const groundingChunks = chatAttachments.filter((a): a is GroundingChunk => "web" in a);
    const nonGroundingAttachments = chatAttachments.filter((a) => !("web" in a));

    const seenGroundingUris = new Set<string>();
    const dedupedGrounding = groundingChunks.filter((chunk) => {
        if (seenGroundingUris.has(chunk.web.uri)) return false;
        seenGroundingUris.add(chunk.web.uri);
        return true;
    });

    const finalAttachments: ChatAttachment[] = [
        ...nonGroundingAttachments,
        ...writtenCards,
    ];

    if (dedupedGrounding.length > 0) {
        finalAttachments.push({
            type: "sources",
            chunks: dedupedGrounding,
        });
    }

    return finalAttachments;
}
