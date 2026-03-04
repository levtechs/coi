import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    arrayUnion,
    arrayRemove,
} from "firebase/firestore";
import { getVerifiedUid } from "@/app/api/helpers";
import { Friendship } from "@/lib/types";

/**
 * PUT /api/friends/[friendshipId]
 * Accept a pending friend request. Only the non-requester can accept.
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ friendshipId: string }> }
) {
    try {
        const uid = await getVerifiedUid(req);
        const { friendshipId } = await params;

        const friendshipRef = doc(db, "friendships", friendshipId);
        const friendshipSnap = await getDoc(friendshipRef);

        if (!friendshipSnap.exists()) {
            return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
        }

        const friendship = { id: friendshipSnap.id, ...friendshipSnap.data() } as Friendship;

        // Only a participant can accept
        if (!friendship.users.includes(uid)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Only the non-requester can accept
        if (friendship.requesterId === uid) {
            return NextResponse.json({ error: "Cannot accept your own friend request" }, { status: 400 });
        }

        if (friendship.status === "accepted") {
            return NextResponse.json({ error: "Already friends" }, { status: 409 });
        }

        const now = new Date().toISOString();

        // Update friendship to accepted
        await updateDoc(friendshipRef, {
            status: "accepted",
            acceptedAt: now,
        });

        // Add each user to the other's friendIds
        const [userA, userB] = friendship.users;
        await Promise.all([
            updateDoc(doc(db, "users", userA), { friendIds: arrayUnion(userB) }),
            updateDoc(doc(db, "users", userB), { friendIds: arrayUnion(userA) }),
        ]);

        return NextResponse.json({ success: true, status: "accepted" });
    } catch (err) {
        console.error("PUT /api/friends/[friendshipId] error:", err);
        return NextResponse.json({ error: "Failed to accept friend request" }, { status: 500 });
    }
}

/**
 * DELETE /api/friends/[friendshipId]
 * Remove a friend or decline/cancel a pending request.
 * Either participant can delete.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ friendshipId: string }> }
) {
    try {
        const uid = await getVerifiedUid(req);
        const { friendshipId } = await params;

        const friendshipRef = doc(db, "friendships", friendshipId);
        const friendshipSnap = await getDoc(friendshipRef);

        if (!friendshipSnap.exists()) {
            return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
        }

        const friendship = { id: friendshipSnap.id, ...friendshipSnap.data() } as Friendship;

        // Only a participant can delete
        if (!friendship.users.includes(uid)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // If it was an accepted friendship, remove from both users' friendIds
        if (friendship.status === "accepted") {
            const [userA, userB] = friendship.users;
            await Promise.all([
                updateDoc(doc(db, "users", userA), { friendIds: arrayRemove(userB) }),
                updateDoc(doc(db, "users", userB), { friendIds: arrayRemove(userA) }),
            ]);
        }

        // Delete the friendship document
        await deleteDoc(friendshipRef);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/friends/[friendshipId] error:", err);
        return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 });
    }
}
