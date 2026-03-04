import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    getDoc,
} from "firebase/firestore";
import { getVerifiedUid } from "@/app/api/helpers";
import { Friendship } from "@/lib/types";

/**
 * GET /api/friends
 * Returns the current user's friends list and pending requests.
 * Query params:
 *   ?status=accepted (default) | pending | all
 */
export async function GET(req: NextRequest) {
    try {
        const uid = await getVerifiedUid(req);
        const { searchParams } = new URL(req.url);
        const statusFilter = searchParams.get("status") || "all";

        // Query friendships where the user is a participant
        const friendshipsRef = collection(db, "friendships");
        const q = query(friendshipsRef, where("users", "array-contains", uid));
        const snap = await getDocs(q);

        const friendships: Friendship[] = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as Friendship[];

        // Filter by status if needed
        const filtered =
            statusFilter === "all"
                ? friendships
                : friendships.filter((f) => f.status === statusFilter);

        // Collect all unique friend UIDs for bulk lookup
        const friendUids = new Set<string>();
        for (const f of filtered) {
            const friendUid = f.users[0] === uid ? f.users[1] : f.users[0];
            friendUids.add(friendUid);
        }

        // Fetch user profiles for all friends
        const userProfiles: Record<string, { id: string; displayName: string; email: string }> = {};
        await Promise.all(
            Array.from(friendUids).map(async (friendUid) => {
                const userDoc = await getDoc(doc(db, "users", friendUid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    userProfiles[friendUid] = {
                        id: friendUid,
                        displayName: data.displayName || "Unknown",
                        email: data.email || "",
                    };
                }
            })
        );

        // Build response with friend info attached
        const result = filtered.map((f) => {
            const friendUid = f.users[0] === uid ? f.users[1] : f.users[0];
            return {
                id: f.id,
                status: f.status,
                requesterId: f.requesterId,
                createdAt: f.createdAt,
                acceptedAt: f.acceptedAt || null,
                friend: userProfiles[friendUid] || { id: friendUid, displayName: "Unknown", email: "" },
            };
        });

        return NextResponse.json({ friendships: result });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

/**
 * POST /api/friends
 * Send a friend request.
 * Body: { userId: string } — the UID of the person to friend
 */
export async function POST(req: NextRequest) {
    try {
        const uid = await getVerifiedUid(req);
        const body = await req.json();
        const { userId } = body as { userId: string };

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        if (userId === uid) {
            return NextResponse.json({ error: "Cannot send a friend request to yourself" }, { status: 400 });
        }

        // Check target user exists
        const targetDoc = await getDoc(doc(db, "users", userId));
        if (!targetDoc.exists()) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if a friendship already exists between these two users
        const sortedUsers = [uid, userId].sort() as [string, string];
        const friendshipsRef = collection(db, "friendships");
        const existingQuery = query(
            friendshipsRef,
            where("users", "==", sortedUsers)
        );
        const existingSnap = await getDocs(existingQuery);

        if (!existingSnap.empty) {
            const existing = existingSnap.docs[0].data();
            if (existing.status === "accepted") {
                return NextResponse.json({ error: "Already friends" }, { status: 409 });
            }
            if (existing.status === "pending") {
                return NextResponse.json({ error: "Friend request already pending" }, { status: 409 });
            }
        }

        // Create friendship document
        const friendshipDoc = await addDoc(friendshipsRef, {
            users: sortedUsers,
            status: "pending",
            requesterId: uid,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ id: friendshipDoc.id, status: "pending" });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
