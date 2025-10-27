import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../../../../helpers";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string; commentId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, commentId } = await params;

    try {
        const body = await req.json();
        const { type } = body; // 'upvote', 'downvote', or 'remove'

        if (!['upvote', 'downvote', 'remove'].includes(type)) {
            return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
        }

        // Check course access
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();
        const hasAccess =
            courseData?.ownerId === uid ||
            (courseData?.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData?.public === true;

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Check comment exists
        const commentRef = doc(db, 'courses', courseId, 'comments', commentId);
        const commentSnap = await getDoc(commentRef);

        if (!commentSnap.exists()) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        const commentData = commentSnap.data();
        const upvotes = commentData?.upvotes || [];
        const downvotes = commentData?.downvotes || [];

        // Remove existing votes from this user
        const newUpvotes = upvotes.filter((id: string) => id !== uid);
        const newDownvotes = downvotes.filter((id: string) => id !== uid);

        // Add new vote if not removing
        if (type === 'upvote') {
            newUpvotes.push(uid);
        } else if (type === 'downvote') {
            newDownvotes.push(uid);
        }
        // If type is 'remove', we just remove existing votes

        // Update comment
        await updateDoc(commentRef, {
            upvotes: newUpvotes,
            downvotes: newDownvotes,
        });

        return NextResponse.json({
            upvotes: newUpvotes.length,
            downvotes: newDownvotes.length,
        });
    } catch (error) {
        console.error("Error voting on comment:", error);
        return NextResponse.json({ error: "Failed to vote on comment" }, { status: 500 });
    }
}