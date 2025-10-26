import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../../../helpers";
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";
import { UpdateCommentData } from "@/lib/types";

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
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Check comment ownership
        const commentRef = doc(db, 'courses', courseId, 'comments', commentId);
        const commentSnap = await getDoc(commentRef);

        if (!commentSnap.exists()) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        const commentData = commentSnap.data();
        if (commentData?.userId !== uid) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Update comment
        await updateDoc(commentRef, {
            content: body.content.trim(),
            updatedAt: Timestamp.now(),
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
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();
        const isOwner = courseData?.ownerId === uid;

        // Check comment ownership
        const commentRef = doc(db, 'courses', courseId, 'comments', commentId);
        const commentSnap = await getDoc(commentRef);

        if (!commentSnap.exists()) {
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
            await updateDoc(commentRef, {
                content: "[deleted]",
                updatedAt: Timestamp.now(),
            });
        } else {
            // Remove from parent's replies array if it's a reply
            if (commentData?.parentId) {
                const parentRef = doc(db, 'courses', courseId, 'comments', commentData.parentId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const parentData = parentSnap.data();
                    const updatedReplies = (parentData?.replies || []).filter((id: string) => id !== commentId);
                    await updateDoc(parentRef, { replies: updatedReplies });
                }
            }

            // Delete the comment
            await deleteDoc(commentRef);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting comment:", error);
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }
}