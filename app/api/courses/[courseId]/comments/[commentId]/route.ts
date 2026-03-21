import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";
import { getVerifiedUid } from "../../../../helpers";
import { UpdateCommentData } from "@/lib/types/comments";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string; commentId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, commentId } = await params;

    try {
        const body: UpdateCommentData = await req.json();

        if (!body.content || body.content.trim().length === 0) {
            return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
        }

        // Check course access
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Check comment ownership
        const commentRef = courseRef.collection('comments').doc(commentId);
        const commentSnap = await commentRef.get();

        if (!commentSnap.exists) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        const commentData = commentSnap.data();
        if (commentData?.userId !== uid) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Update comment
        await commentRef.update({
            content: body.content.trim(),
            updatedAt: admin.firestore.Timestamp.now(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating comment:", error);
        return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string; commentId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, commentId } = await params;

    try {
        // Check course access and ownership
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();
        const isOwner = courseData?.ownerId === uid;

        // Check comment ownership
        const commentRef = courseRef.collection('comments').doc(commentId);
        const commentSnap = await commentRef.get();

        if (!commentSnap.exists) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        const commentData = commentSnap.data();
        const isCommentAuthor = commentData?.userId === uid;

        if (!isOwner && !isCommentAuthor) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // If this comment has replies, we should either delete them too or mark as deleted
        // For now, we'll do a soft delete by marking the content as deleted
        if (commentData?.replies && commentData.replies.length > 0) {
            await commentRef.update({
                content: "[deleted]",
                updatedAt: admin.firestore.Timestamp.now(),
            });
        } else {
            // Remove from parent's replies array if it's a reply
            if (commentData?.parentId) {
                const parentRef = courseRef.collection('comments').doc(commentData.parentId);
                const parentSnap = await parentRef.get();

                if (parentSnap.exists) {
                    const parentData = parentSnap.data();
                    const updatedReplies = (parentData?.replies || []).filter((id: string) => id !== commentId);
                    await parentRef.update({ replies: updatedReplies });
                }
            }

            // Delete the comment
            await commentRef.delete();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting comment:", error);
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }
}