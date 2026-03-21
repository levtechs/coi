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
