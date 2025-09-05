import { apiFetch } from "./helpers";

/**
 * Creates a new invitation token for a project.
 * @param projectId The ID of the project to create an invitation for.
 * @param isLongLived Whether the token should be long-lived (no expiration) or not.
 * @returns A promise that resolves to an object containing the new token.
 */
export async function createInvitation(projectId: string, isLongLived: boolean): Promise<{ token: string, isLongLived: boolean }> {
    const data = await apiFetch<{ token: string, isLongLived: boolean }>(`/api/invite`, {
        method: "POST",
        body: JSON.stringify({ projectId, isLongLived }),
    });
    return data;
}

/**
 * Accepts an invitation to a project using a token.
 * This view requires the user to be authenticated.
 * @param token The invitation token to accept.
 * @returns A promise that resolves when the invitation is successfully accepted.
 */
export async function acceptInvitation(token: string): Promise<void> {
    await apiFetch(`/api/invite`, {
        method: "PUT",
        body: JSON.stringify({ token }),
    });
}

/**
 * Retrieves a project's title using only an invitation token.
 * This view does not require authentication.
 * @param token The invitation token.
 * @returns A promise that resolves to the project's title.
 */
export async function getProjectTitleByToken(token: string): Promise<{ title: string }> {
    const response = await fetch(`/api/invite?token=${token}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch project title.");
    }
    return response.json();
}
