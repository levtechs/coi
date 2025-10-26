"use client";

import { useState } from "react";
import Button from "../../button";

interface CommentFormProps {
    onSubmit: (content: string) => Promise<void>;
    submitting: boolean;
    placeholder?: string;
    initialValue?: string;
    onCancel?: () => void;
}

export default function CommentForm({
    onSubmit,
    submitting,
    placeholder = "Write a comment...",
    initialValue = "",
    onCancel
}: CommentFormProps) {
    const [content, setContent] = useState(initialValue);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || submitting) return;

        await onSubmit(content.trim());
        if (!initialValue) {
            setContent("");
        }
    };

    const handleCancel = () => {
        setContent(initialValue);
        onCancel?.();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="w-full p-3 border border-[var(--neutral-300)] rounded-lg bg-[var(--neutral-100)] text-[var(--foreground)] placeholder-[var(--neutral-500)] resize-vertical min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
                disabled={submitting}
                rows={3}
            />
            <div className="flex gap-2 justify-end">
                {onCancel && (
                    <Button
                        type="button"
                        color="var(--neutral-300)"
                        onClick={handleCancel}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    color="var(--accent-500)"
                    disabled={!content.trim() || submitting}
                >
                    {submitting ? "Posting..." : "Post Comment"}
                </Button>
            </div>
        </form>
    );
}