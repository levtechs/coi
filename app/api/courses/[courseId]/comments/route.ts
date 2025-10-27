import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../../helpers";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, query, orderBy, Timestamp } from "firebase/firestore";
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
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();
        const hasAccess =
            courseData.ownerId === uid ||
            (courseData.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData.public === true;

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Fetch all comments
        const commentsRef = collection(db, 'courses', courseId, 'comments');
        const commentsSnap = await getDocs(query(commentsRef, orderBy('createdAt', 'desc')));

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
            const userRef = doc(db, 'users', comment.userId);
            const userSnap = await getDoc(userRef);
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
            comments.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
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
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();
        const hasAccess =
            courseData.ownerId === uid ||
            (courseData.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData.public === true;

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // If replying to a comment, verify parent exists
        if (body.parentId) {
            const parentRef = doc(db, 'courses', courseId, 'comments', body.parentId);
            const parentSnap = await getDoc(parentRef);

            if (!parentSnap.exists()) {
                return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
            }
        }

        const now = Timestamp.now();
        const commentData: Omit<Comment, 'id'> = {
            userId: uid,
            content: body.content.trim(),
            createdAt: now,
            updatedAt: now,
            parentId: body.parentId || null,
            upvotes: [],
            downvotes: [],
            replies: [],
        };

        // Add comment
        const commentsRef = collection(db, 'courses', courseId, 'comments');
        const docRef = await addDoc(commentsRef, commentData);

        // If this is a reply, add to parent's replies array
        if (body.parentId) {
            const parentRef = doc(db, 'courses', courseId, 'comments', body.parentId);
            const parentSnap = await getDoc(parentRef);

            if (parentSnap.exists()) {
                const parentData = parentSnap.data();
                const updatedReplies = [...(parentData?.replies || []), docRef.id];
                await updateDoc(parentRef, { replies: updatedReplies });
            }
        }

        // Fetch current user info for the response
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
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