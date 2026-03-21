import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";
import { getVerifiedUid } from "@/app/api/helpers";
import { Friendship } from "@/lib/types/friends";

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

        const friendshipRef = adminDb.collection("friendships").doc(friendshipId);
        const friendshipSnap = await friendshipRef.get();

        if (!friendshipSnap.exists) {
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
        await friendshipRef.update({
            status: "accepted",
            acceptedAt: now,
        });

        // Add each user to the other's friendIds
        const [userA, userB] = friendship.users;
        await Promise.all([
            adminDb.collection("users").doc(userA).update({ friendIds: admin.firestore.FieldValue.arrayUnion(userB) }),
            adminDb.collection("users").doc(userB).update({ friendIds: admin.firestore.FieldValue.arrayUnion(userA) }),
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

        const friendshipRef = adminDb.collection("friendships").doc(friendshipId);
        const friendshipSnap = await friendshipRef.get();

        if (!friendshipSnap.exists) {
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
                adminDb.collection("users").doc(userA).update({ friendIds: admin.firestore.FieldValue.arrayRemove(userB) }),
                adminDb.collection("users").doc(userB).update({ friendIds: admin.firestore.FieldValue.arrayRemove(userA) }),
            ]);
        }

        // Delete the friendship document
        await friendshipRef.delete();

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/friends/[friendshipId] error:", err);
        return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 });
    }
}
