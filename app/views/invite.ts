import { apiFetch } from "./helpers";

/**
 * Creates a new invitation token for a project.
 * @param projectId The ID of the project to create an invitation for.
 * @returns A promise that resolves to an object containing the new token.
 */
export async function createInvitation(projectId: string): Promise<{ token: string, isLongLived: boolean }> {
    const data = await apiFetch<{ token: string, isLongLived: boolean }>(`/api/invite`, {
        method: "POST",
        body: JSON.stringify({ projectId }),
    });
    return data;
}

/**
 * Creates a new invitation token for a course.
 * @param courseId The ID of the course to create an invitation for.
 * @returns A promise that resolves to an object containing the new token.
 */
export async function createCourseInvitation(courseId: string): Promise<{ token: string, isLongLived: boolean }> {
    const data = await apiFetch<{ token: string, isLongLived: boolean }>(`/api/invite`, {
        method: "POST",
        body: JSON.stringify({ courseId }),
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
 * Retrieves the title, type, and creator's name using only an invitation token.
 * This view does not require authentication.
 * @param token The invitation token.
 * @returns A promise that resolves to the title, type, and createdByName.
 */
export async function getTitleByToken(token: string): Promise<{ title: string; type: 'project' | 'course'; createdByName: string; id: string }> {
    const response = await fetch(`/api/invite?token=${token}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch title.");
    }
    return response.json();
}

/**
 * Retrieves the invitations for a project.
 * @param projectId The project ID.
 * @returns A promise that resolves to the list of invitations.
 */
export async function getProjectInvitations(projectId: string): Promise<{ token: string; createdAt: string; createdBy: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[]> {
    const data = await apiFetch<{ invitations: { token: string; createdAt: string; createdBy: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[]; }>(`/api/projects/${projectId}/invitations`);
    return data.invitations;
}
