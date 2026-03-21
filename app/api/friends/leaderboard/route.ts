import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getVerifiedUid } from "@/app/api/helpers";
import { Friendship, LeaderboardEntry } from "@/lib/types/friends";

/**
 * GET /api/friends/leaderboard
 * Returns the current user + accepted friends ranked by weekly activity.
 */
export async function GET(req: NextRequest) {
    try {
        const uid = await getVerifiedUid(req);

        // Get all accepted friendships
        const friendshipsRef = adminDb.collection("friendships");
        const q = friendshipsRef.where("users", "array-contains", uid);
        const snap = await q.get();

        const friendships: Friendship[] = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as Friendship[];

        const accepted = friendships.filter((f) => f.status === "accepted");

        // Collect friend UIDs + current user
        const userIds = new Set<string>([uid]);
        for (const f of accepted) {
            const friendUid = f.users[0] === uid ? f.users[1] : f.users[0];
            userIds.add(friendUid);
        }

        // Fetch all user profiles
        const results = await Promise.all(
            Array.from(userIds).map(async (userId) => {
                const userDoc = await adminDb.collection("users").doc(userId).get();
                if (!userDoc.exists) return null;
                const data = userDoc.data()!;
                return {
                    id: userId,
                    displayName: data.displayName || "Unknown",
                    weeklyActions: data.weeklyActions || 0,
                    dailyActions: data.dailyActions || 0,
                    actions: data.actions || 0,
                    projectCount: data.projectIds?.length || 0,
                    isCurrentUser: userId === uid,
                } satisfies LeaderboardEntry;
            })
        );

        // Filter nulls and sort by weekly actions descending
        const entries = results
            .filter((e): e is LeaderboardEntry => e !== null)
            .sort((a, b) => b.weeklyActions - a.weeklyActions);

        return NextResponse.json({ leaderboard: entries });
    } catch (err) {
        console.error("GET /api/friends/leaderboard error:", err);
        return NextResponse.json(
            { error: "Failed to fetch leaderboard" },
            { status: 500 }
        );
    }
}
