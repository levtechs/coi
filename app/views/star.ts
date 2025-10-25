import { apiFetch } from "./helpers";

export async function upgradeToStar(code: string) {
    return apiFetch<{ success: boolean } | { error: string }>("/api/star", {
        method: "POST",
        body: JSON.stringify({ code }),
    });
}