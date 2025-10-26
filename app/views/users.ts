import { User, SignUpResponses } from "@/lib/types";

import { apiFetch } from "./helpers";

/**
 * Get the user ID (uid) from an email.
 * @param email The email of the user to search for.
 * @returns The user's ID, or null if not found.
 */
export async function getUserIdFromEmail(email: string): Promise<string | null> {
    try {
        const data = await apiFetch<{ uid: string }>(`/api/users?email=${encodeURIComponent(email)}`);
        return data.uid ?? null;
    } catch (err) {
        console.error("Error fetching UID from email:", err);
        return null;
    }
}

/**
 * Get the user from a user ID (uid).
 * @param userId The ID of the user to fetch.
 * @returns The user object, or null if not found.
 */
export async function getUserFromId(userId: string): Promise<User | null> {
    try {
        const data = await apiFetch<User>(`/api/users/${userId}`);
        return data;
    } catch (err) {
        console.error("Error fetching user from UID:", err);
        return null;
    }
}

/**
 * Update a user's sign-up responses.
 * @param userId The ID of the user to update.
 * @param responses The sign-up responses to save.
 * @returns Success status.
 */
export async function updateUserSignUpResponses(userId: string, responses: SignUpResponses): Promise<boolean> {
    try {
        await apiFetch(`/api/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ signUpResponses: responses }),
        });
        return true;
    } catch (err) {
        console.error("Error updating user sign-up responses:", err);
        return false;
    }
}
