import { auth } from "@/lib/firebase";

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const idToken = await user.getIdToken();

    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
            ...(options?.headers || {}),
        },
    });

    if (!res.ok) {
        let errorMessage = `API request failed: ${res.status}`;
        try {
            const errorData = await res.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch (e) { console.error("Failed to parse API error response body:", e); }
        throw new Error(errorMessage);
    }
    return res.json() as Promise<T>;
}
