"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { CommentTree, CreateCommentData } from "@/lib/types";
import { createComment } from "@/app/views/courses";
import CommentForm from "./comment_form";
import CommentItem from "./comment_item";

interface CommentTreeProps {
    comment: CommentTree;
    courseId: string;
    onCommentUpdate: () => void;
    depth?: number;
}

export default function CommentTreeComponent({
    comment,
    courseId,
    onCommentUpdate,
    depth = 0
}: CommentTreeProps) {
    const { user } = useAuth();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replying, setReplying] = useState(false);

    const handleReply = async (content: string) => {
        if (!user || replying) return;

        setReplying(true);
        try {
            const replyData: CreateCommentData = {
                content,
                parentId: comment.id
            };
            await createComment(courseId, replyData);
            onCommentUpdate();
            setShowReplyForm(false);
        } catch (error) {
            console.error("Failed to reply:", error);
        } finally {
            setReplying(false);
        }
    };

    const maxDepth = 5; // Prevent infinite nesting
    const canReply = depth < maxDepth;

    return (
        <div className={`${depth > 0 ? 'ml-6 pl-4 border-l-2 border-[var(--neutral-300)]' : ''}`}>
            <CommentItem
                comment={comment}
                courseId={courseId}
                onCommentUpdate={onCommentUpdate}
                onReply={() => canReply && setShowReplyForm(!showReplyForm)}
                showReplyButton={canReply}
            />

            {showReplyForm && user && (
                <div className="mt-3 mb-4">
                    <CommentForm
                        onSubmit={handleReply}
                        submitting={replying}
                        placeholder="Write a reply..."
                        onCancel={() => setShowReplyForm(false)}
                    />
                </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-4">
                    {comment.replies.map((reply) => (
                        <CommentTreeComponent
                            key={reply.id}
                            comment={reply}
                            courseId={courseId}
                            onCommentUpdate={onCommentUpdate}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

