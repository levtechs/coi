// views/users.ts

/**
 * Get the user ID (uid) from an email.
 */
export async function getUserIdFromEmail(email: string): Promise<string | null> {
    try {
        const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
        if (!res.ok) {
            console.error("Failed to fetch UID:", await res.json());
            return null;
        }
        const data = await res.json();
        return data.uid ?? null;
    } catch (err) {
        console.error("Error fetching UID from email:", err);
        return null;
    }
}

/**
 * Get the email from a user ID (uid).
 */
export async function getEmailFromUserId(userId: string): Promise<string | null> {
    try {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) {
            console.error("Failed to fetch email:", await res.json());
            return null;
        }
        const data = await res.json();
        return data.email ?? null;
    } catch (err) {
        console.error("Error fetching email from UID:", err);
        return null;
    }
}
