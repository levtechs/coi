import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";
import { getVerifiedUid } from "../../../helpers";
import { Comment, CommentTree, CreateCommentData } from "@/lib/types";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    try {
        // Check course access
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();
        if (!courseData) return NextResponse.json({ error: "Course data is empty" }, { status: 404 });

        const hasAccess =
            courseData.ownerId === uid ||
            (courseData.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData.public === true;

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Fetch all comments
        const commentsRef = courseRef.collection('comments');
        const commentsSnap = await commentsRef.orderBy('createdAt', 'desc').get();

        const comments: Comment[] = commentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Comment[];

        // Build comment tree
        const commentMap = new Map<string, CommentTree>();
        const rootComments: CommentTree[] = [];

        // First pass: create CommentTree objects and map by ID
        for (const comment of comments) {
            // Skip deleted comments
            if (comment.content === '[deleted]') {
                continue;
            }
            // Fetch author info
            const userRef = adminDb.collection('users').doc(comment.userId);
            const userSnap = await userRef.get();
            const userData = userSnap.data();

            const commentTree: CommentTree = {
                ...comment,
                author: {
                    id: comment.userId,
                    displayName: userData?.displayName || 'Unknown User',
                    email: userData?.email || '',
                },
                replies: [],
            };

            commentMap.set(comment.id, commentTree);
        }

        // Second pass: build tree structure
        for (const comment of comments) {
            // Skip deleted comments
            if (comment.content === '[deleted]') {
                continue;
            }

            const commentTree = commentMap.get(comment.id)!;

            if (comment.parentId) {
                const parent = commentMap.get(comment.parentId);
                if (parent) {
                    parent.replies.push(commentTree);
                }
            } else {
                rootComments.push(commentTree);
            }
        }

        // Sort replies by creation time
        const sortReplies = (comments: CommentTree[]): void => {
            comments.sort((a, b) => {
                const aTime = (a.createdAt as any).toMillis?.() || new Date(a.createdAt as any).getTime();
                const bTime = (b.createdAt as any).toMillis?.() || new Date(b.createdAt as any).getTime();
                return aTime - bTime;
            });
            comments.forEach(comment => sortReplies(comment.replies));
        };

        sortReplies(rootComments);

        return NextResponse.json(rootComments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    try {
        const body: CreateCommentData = await req.json();

        if (!body.content || body.content.trim().length === 0) {
            return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
        }

        // Check course access
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();
        if (!courseData) return NextResponse.json({ error: "Course data is empty" }, { status: 404 });
        const hasAccess =
            courseData.ownerId === uid ||
            (courseData.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData.public === true;

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // If replying to a comment, verify parent exists
        if (body.parentId) {
            const parentRef = courseRef.collection('comments').doc(body.parentId);
            const parentSnap = await parentRef.get();

            if (!parentSnap.exists) {
                return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
            }
        }

        const now = admin.firestore.Timestamp.now();
        const commentData: Omit<Comment, 'id'> = {
            userId: uid,
            content: body.content.trim(),
            createdAt: now as any,
            updatedAt: now as any,
            parentId: body.parentId || null,
            upvotes: [],
            downvotes: [],
            replies: [],
        };

        // Add comment
        const commentsRef = courseRef.collection('comments');
        const docRef = await commentsRef.add(commentData);

        // If this is a reply, add to parent's replies array
        if (body.parentId) {
            const parentRef = commentsRef.doc(body.parentId);
            const parentSnap = await parentRef.get();

            if (parentSnap.exists) {
                await parentRef.update({
                    replies: admin.firestore.FieldValue.arrayUnion(docRef.id)
                });
            }
        }

        // Fetch current user info for the response
        const userRef = adminDb.collection('users').doc(uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        return NextResponse.json({
            id: docRef.id,
            ...commentData,
            author: {
                id: uid,
                displayName: userData?.displayName || 'Unknown User',
                email: userData?.email || '',
            },
            replies: [],
        });
    } catch (error) {
        console.error("Error creating comment:", error);
        return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
    }
}