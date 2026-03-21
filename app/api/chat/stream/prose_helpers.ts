import { Card } from "@/lib/types";

export function stripTransportTags(text: string): string {
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

export function resolveNewCardTitle(title: string, writtenCards: Card[]): string {
    const card = writtenCards.find((item) => item.title === title);
    return card ? `(card: ${card.id})` : title;
}

export function replaceInlineRefs(text: string, writtenCards: Card[]): string {
    let output = text;
    output = output.replace(/<NewCardRef\s+title="([^"]+)"\s*\/>/gi, (_match, title: string) => resolveNewCardTitle(title, writtenCards));
    output = output.replace(/<CardRef\s+id="([^"]+)"\s*\/>/gi, (_match, id: string) => `(card: ${id})`);
    output = output.replace(/<\/?FollowUp>/gi, "");
    output = output.replace(/<\/?Action>/gi, "");
    output = output.replace(/<\/?UnlockCards>/gi, "");
    output = output.replace(/<\/?Prose>/gi, "");
    return output;
}
