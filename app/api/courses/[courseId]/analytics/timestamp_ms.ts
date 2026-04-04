/**
 * Normalize Firestore Admin / stored Timestamp shapes to milliseconds for sorting and duration math.
 */
export function timestampToMillis(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === "string") {
        const t = Date.parse(value);
        return Number.isFinite(t) ? t : null;
    }
    if (value instanceof Date) {
        const t = value.getTime();
        return Number.isFinite(t) ? t : null;
    }
    if (typeof value === "object") {
        const o = value as { toMillis?: () => number; seconds?: unknown; _seconds?: unknown };
        if (typeof o.toMillis === "function") {
            try {
                const t = o.toMillis();
                return Number.isFinite(t) ? t : null;
            } catch {
                return null;
            }
        }
        const sec = typeof o.seconds === "number" ? o.seconds : typeof o._seconds === "number" ? o._seconds : NaN;
        if (Number.isFinite(sec)) return sec * 1000;
    }
    return null;
}
