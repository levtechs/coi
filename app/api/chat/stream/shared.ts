import { Card, ChatAttachment, GroundingChunk, NewCard } from "@/lib/types";
import { ModelCard } from "./types";

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

type ResolvedGroundingChunk = {
    original: GroundingChunk;
    resolvedUri: string;
    resolvedTitle: string;
};

async function resolveGroundingChunk(chunk: GroundingChunk): Promise<ResolvedGroundingChunk> {
    let resolvedUri = chunk.web.uri;
    let resolvedTitle = chunk.web.title;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(chunk.web.uri, {
            redirect: "follow",
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.url) {
            resolvedUri = response.url;
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
            const html = await response.text();
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (titleMatch?.[1]) {
                resolvedTitle = decodeHtmlEntities(titleMatch[1]).trim();
            }
        }
    } catch (err) {
        console.warn("[chat-stream] failed to resolve grounding chunk redirect", {
            uri: chunk.web.uri,
            title: chunk.web.title,
            err: err instanceof Error ? err.message : String(err),
        });
    }

    return {
        original: chunk,
        resolvedUri,
        resolvedTitle,
    };
}

export async function matchResourceCardsToGroundingChunks(
    modelCards: ModelCard[],
    groundingChunks: GroundingChunk[],
): Promise<{ usedChunkUris: Set<string>; matchedResourceCards: NewCard[] }> {
    const usedChunkUris = new Set<string>();
    const resolvedChunks = await Promise.all(groundingChunks.map(resolveGroundingChunk));
    const matchedResourceCards: NewCard[] = [];

    const resourceCards = modelCards.filter((card): card is Extract<ModelCard, { tagType: "resource" }> => card.tagType === "resource");

    for (const modelCard of resourceCards) {
        const chunk = resolvedChunks[modelCard.resultIndex - 1];
        if (!chunk) {
            console.warn("[chat-stream] dropped resource card with invalid resultIndex", {
                title: modelCard.title,
                resultIndex: modelCard.resultIndex,
                groundingChunkCount: resolvedChunks.length,
            });
            continue;
        }

        usedChunkUris.add(chunk.original.web.uri);
        matchedResourceCards.push({
            title: modelCard.title,
            details: modelCard.details,
            kind: "resource",
            url: chunk.resolvedUri,
        });
    }

    return { usedChunkUris, matchedResourceCards };
}

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
