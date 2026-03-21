import { ActiveBlock, BlockTag, KnowledgeCardSpec, ResourceCardSpec } from "./types";

export function isPotentialPartialTopLevelTag(fragment: string): boolean {
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

export function parseAttributes(rawAttrs: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(rawAttrs)) !== null) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

export function parseResourceCards(body: string, attrs: Record<string, string>): ResourceCardSpec[] {
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

export function parseKnowledgeCards(body: string): KnowledgeCardSpec[] {
    return parseCardBodies(body).map((parsed) => ({
        tagType: "knowledge" as const,
        title: parsed.title,
        details: parsed.details,
    }));
}

export function parseUnlockCards(body: string): string[] {
    return body
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

export function extractTaggedBodies(text: string, tagName: string): string[] {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`, "gi");
    const bodies: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        const body = match[1]?.trim();
        if (body) bodies.push(body);
    }
    return bodies;
}

export function findOpenTag(buffer: string): { index: number; tag: BlockTag; raw: string; attrs: Record<string, string> } | null {
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
}

export function createActiveBlock(tag: BlockTag, attrs: Record<string, string> = {}): ActiveBlock {
    return { tag, attrs, buffer: "" };
}
