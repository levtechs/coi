"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { CommentTree } from "@/lib/types";
import { updateComment, deleteComment, voteOnComment } from "@/app/views/courses";
import { Timestamp } from "firebase/firestore";
import { FiThumbsUp, FiThumbsDown, FiMessageSquare, FiEdit2, FiTrash2, FiMoreVertical } from "react-icons/fi";
import CommentForm from "./comment_form";

interface CommentItemProps {
    comment: CommentTree;
    courseId: string;
    isCourseOwner?: boolean;
    onCommentUpdate: () => void;
    onReply?: () => void;
    showReplyButton?: boolean;
}

export default function CommentItem({
    comment,
    courseId,
    isCourseOwner,
    onCommentUpdate,
    onReply,
    showReplyButton = true
}: CommentItemProps) {
    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [voting, setVoting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const isAuthor = user?.uid === comment.userId;
    const canManageComment = isAuthor || isCourseOwner;
    const hasUpvoted = user && comment.upvotes.includes(user.uid);
    const hasDownvoted = user && comment.downvotes.includes(user.uid);

    const handleEdit = async (content: string) => {
        if (updating) return;

        setUpdating(true);
        try {
            const success = await updateComment(courseId, comment.id, { content });
            if (success) {
                onCommentUpdate();
                setEditing(false);
            }
        } catch (error) {
            console.error("Failed to update comment:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (deleting || !confirm("Are you sure you want to delete this comment?")) return;

        setDeleting(true);
        try {
            const success = await deleteComment(courseId, comment.id);
            if (success) {
                onCommentUpdate();
            }
        } catch (error) {
            console.error("Failed to delete comment:", error);
        } finally {
            setDeleting(false);
        }
    };

    const handleVote = async (voteType: 'upvote' | 'downvote' | 'remove') => {
        if (!user || voting) return;

        setVoting(true);
        try {
            await voteOnComment(courseId, comment.id, voteType);
            onCommentUpdate();
        } catch (error) {
            console.error("Failed to vote:", error);
        } finally {
            setVoting(false);
        }
    };

    const formatDate = (timestamp: Timestamp | Date | { seconds: number; nanoseconds?: number }) => {
        let date: Date;

        if (timestamp instanceof Timestamp) {
            date = timestamp.toDate();
        } else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
            // Firestore timestamp object
            date = new Date(timestamp.seconds * 1000);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            // Fallback for invalid dates
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getTimeMillis = (timestamp: Timestamp | Date | { seconds: number; nanoseconds?: number }) => {
        if (timestamp instanceof Timestamp) {
            return timestamp.toMillis();
        } else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
            // Firestore timestamp object
            return timestamp.seconds * 1000;
        } else if (timestamp instanceof Date) {
            return timestamp.getTime();
        } else {
            return new Date(timestamp).getTime();
        }
    };

    if (editing) {
        return (
            <div className="bg-[var(--neutral-200)] p-4 rounded-lg">
                <CommentForm
                    onSubmit={handleEdit}
                    submitting={updating}
                    initialValue={comment.content}
                    onCancel={() => setEditing(false)}
                    placeholder="Edit your comment..."
                />
            </div>
        );
    }

    return (
        <div className="bg-[var(--neutral-200)] p-4 rounded-lg">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--foreground)]">
                        {comment.author?.displayName || 'Unknown User'}
                    </span>
                    <span className="text-sm text-[var(--neutral-600)]">
                        {formatDate(comment.createdAt)}
                    </span>
                    {comment.updatedAt && Math.abs(getTimeMillis(comment.updatedAt) - getTimeMillis(comment.createdAt)) > 1000 && (
                        <span className="text-xs text-[var(--neutral-500)]">(edited)</span>
                    )}
                </div>

                {canManageComment && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 hover:bg-[var(--neutral-300)] rounded"
                        >
                            <FiMoreVertical size={16} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded-lg shadow-lg z-10 min-w-[120px]">
                                {isAuthor && (
                                    <button
                                        onClick={() => {
                                            setEditing(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-[var(--neutral-200)] rounded-t-lg flex items-center gap-2"
                                    >
                                        <FiEdit2 size={14} />
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        handleDelete();
                                        setShowMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 hover:bg-[var(--neutral-200)] flex items-center gap-2 text-red-600 ${
                                        isAuthor ? 'rounded-b-lg' : 'rounded-lg'
                                    }`}
                                    disabled={deleting}
                                >
                                    <FiTrash2 size={14} />
                                    {deleting ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="text-[var(--foreground)] mb-3 whitespace-pre-wrap">
                {comment.content}
            </div>

            <div className="flex items-center gap-4">
                {/* Voting buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleVote(hasUpvoted ? 'remove' : 'upvote')}
                        disabled={!user || voting}
                        className={`p-1 rounded hover:bg-[var(--neutral-300)] ${
                            hasUpvoted ? 'text-green-600' : 'text-[var(--neutral-600)]'
                        }`}
                    >
                        <FiThumbsUp size={16} />
                    </button>
                    <span className="text-sm text-[var(--neutral-600)] min-w-[20px] text-center">
                        {comment.upvotes.length}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleVote(hasDownvoted ? 'remove' : 'downvote')}
                        disabled={!user || voting}
                        className={`p-1 rounded hover:bg-[var(--neutral-300)] ${
                            hasDownvoted ? 'text-red-600' : 'text-[var(--neutral-600)]'
                        }`}
                    >
                        <FiThumbsDown size={16} />
                    </button>
                    <span className="text-sm text-[var(--neutral-600)] min-w-[20px] text-center">
                        {comment.downvotes.length}
                    </span>
                </div>

                {/* Reply button */}
                {showReplyButton && user && (
                    <button
                        onClick={onReply}
                        className="flex items-center gap-1 p-1 rounded hover:bg-[var(--neutral-300)] text-[var(--neutral-600)]"
                    >
                        <FiMessageSquare size={16} />
                        <span className="text-sm">Reply</span>
                    </button>
                )}

                {/* Reply count */}
                {comment.replies && comment.replies.length > 0 && (
                    <span className="text-sm text-[var(--neutral-600)]">
                        {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                )}
            </div>
        </div>
    );
}