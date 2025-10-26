"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createComment } from "@/app/views/courses";
import { CommentTree, CreateCommentData, Comment } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import CommentForm from "./comment_form";
import CommentTreeComponent from "./comment_tree";
import LoadingComponent from "../../loading";

interface CommentSectionProps {
    courseId: string;
    isCourseOwner?: boolean;
}

export default function CommentSection({ courseId, isCourseOwner }: CommentSectionProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Set up real-time listener for comments
        const commentsRef = collection(db, 'courses', courseId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            try {
                const commentsData: Comment[] = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    } as Comment))
                    .filter(comment => comment.content !== '[deleted]'); // Filter out deleted comments

                // Build comment tree with author information
                const commentMap = new Map<string, CommentTree>();
                const rootComments: CommentTree[] = [];

                // First pass: create CommentTree objects and map by ID
                for (const comment of commentsData) {
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
                for (const comment of commentsData) {
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

                // Sort comments by upvotes (descending), then by creation time (ascending)
                const sortComments = (comments: CommentTree[]): void => {
                    comments.sort((a, b) => {
                        // First sort by upvotes (descending)
                        const upvotesDiff = (b.upvotes?.length || 0) - (a.upvotes?.length || 0);
                        if (upvotesDiff !== 0) {
                            return upvotesDiff;
                        }
                        // If upvotes are equal, sort by creation time (ascending)
                        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() :
                                    a.createdAt.seconds ? a.createdAt.seconds * 1000 : 0;
                        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() :
                                    b.createdAt.seconds ? b.createdAt.seconds * 1000 : 0;
                        return aTime - bTime;
                    });
                    comments.forEach(comment => sortComments(comment.replies));
                };

                sortComments(rootComments);

                setComments(rootComments);
                setLoading(false);
            } catch (error) {
                console.error("Error processing comments:", error);
                setLoading(false);
            }
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, [courseId]);



    const handleCreateComment = async (content: string) => {
        if (!user || submitting) return;

        setSubmitting(true);
        try {
            const commentData: CreateCommentData = { content };
            const newComment = await createComment(courseId, commentData);

            if (newComment) {
                setComments(prev => [newComment, ...prev]);
            }
        } catch (error) {
            console.error("Failed to create comment:", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="mt-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Comments</h2>
                <LoadingComponent small={true} />
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                Comments ({comments.length})
            </h2>

            {user && (
                <div className="mb-6">
                    <CommentForm
                        onSubmit={handleCreateComment}
                        submitting={submitting}
                        placeholder="Share your thoughts about this course..."
                    />
                </div>
            )}

            {!user && (
                <div className="mb-6 p-4 bg-[var(--neutral-200)] rounded-lg">
                    <p className="text-[var(--neutral-600)]">
                        Please log in to leave a comment.
                    </p>
                </div>
            )}

            {comments.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-[var(--neutral-600)]">
                        No comments yet. Be the first to share your thoughts!
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {comments.map((comment) => (
                    <CommentTreeComponent
                        key={comment.id}
                        comment={comment}
                        courseId={courseId}
                        isCourseOwner={isCourseOwner}
                        onCommentUpdate={() => {}} // No-op since we use real-time updates
                    />
                ))}
            </div>
        </div>
    );
}