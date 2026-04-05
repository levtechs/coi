import type { Card } from "@/lib/types/cards";

/**
 * Keep only IDs that exist on the lesson template, dedupe, preserve lesson order.
 */
export function sanitizeUnlockCardIds(parsed: string[], cardsToUnlock: Card[]): string[] {
  if (cardsToUnlock.length === 0 || parsed.length === 0) return [];

  const allowed = new Set(cardsToUnlock.map((c) => c.id));
  const lessonOrder = cardsToUnlock.map((c) => c.id);
  const valid = [...new Set(parsed.map((id) => id.trim()).filter((id) => allowed.has(id)))];
  valid.sort((a, b) => lessonOrder.indexOf(a) - lessonOrder.indexOf(b));
  return valid;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * If the model prints a card title on its own line immediately before `(card: sameId)`, drop the redundant title line.
 * Also strips an optional markdown heading prefix on that title line.
 */
export function dedupeStandaloneTitleBeforeCardRef(
  text: string,
  lessonCards: Pick<Card, "id" | "title">[],
): string {
  let out = text;
  for (const { id, title } of lessonCards) {
    const rawTitle = typeof title === "string" ? title.trim() : "";
    if (rawTitle.length < 2) continue;
    const t = escapeRegExp(rawTitle);
    const i = escapeRegExp(id);
    const re = new RegExp(
      `(^|\\n)(\\s*(?:#{1,6}\\s*)?)${t}\\s*(?:\\n[ \\t]*)*\\n?\\s*\\(card:\\s*${i}\\s*\\)`,
      "gm",
    );
    out = out.replace(re, (_whole, lead: string) => `${lead}(card: ${id})`);
  }
  return out;
}
