import { apiFetch } from "./helpers";
import { LeaderboardEntry } from "@/lib/types";

export type { LeaderboardEntry };

export interface FriendshipResponse {
    id: string;
    status: "pending" | "accepted";
    requesterId: string;
    createdAt: string;
    acceptedAt: string | null;
    friend: {
        id: string;
        displayName: string;
        email: string;
    };
}

/**
 * Fetch friendships for the current user.
 * @param status - Filter: "accepted", "pending", or "all" (default: "all")
 */
export async function getFriendships(
    status: "accepted" | "pending" | "all" = "all"
): Promise<FriendshipResponse[]> {
    const data = await apiFetch<{ friendships: FriendshipResponse[] }>(
        `/api/friends?status=${status}`
    );
    return data.friendships;
}

/**
 * Send a friend request to a user by their UID.
 */
export async function sendFriendRequest(
    userId: string
): Promise<{ id: string; status: string }> {
    return apiFetch<{ id: string; status: string }>("/api/friends", {
        method: "POST",
        body: JSON.stringify({ userId }),
    });
}

/**
 * Accept a pending friend request.
 */
export async function acceptFriendRequest(
    friendshipId: string
): Promise<void> {
    await apiFetch(`/api/friends/${friendshipId}`, {
        method: "PUT",
    });
}

/**
 * Remove a friend or decline/cancel a pending request.
 */
export async function removeFriend(friendshipId: string): Promise<void> {
    await apiFetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
    });
}

/**
 * Fetch the friend leaderboard (current user + accepted friends ranked by weekly activity).
 */
export async function getFriendLeaderboard(): Promise<LeaderboardEntry[]> {
    const data = await apiFetch<{ leaderboard: LeaderboardEntry[] }>(
        "/api/friends/leaderboard"
    );
    return data.leaderboard;
}
