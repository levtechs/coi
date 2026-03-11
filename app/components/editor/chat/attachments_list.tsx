"use client";

import { FiX } from "react-icons/fi";
import { ChatAttachment } from "@/lib/types";
import { Dispatch, SetStateAction } from "react";

interface AttachmentsListProps {
    attachments: ChatAttachment[];
    setAttachments: Dispatch<SetStateAction<ChatAttachment[] | null>>;
    variant?: "fullscreen" | "standard";
}

export const getAttachmentKey = (attachment: ChatAttachment, index: number): string => {
    if ("id" in attachment && attachment.id) return attachment.id;
    if ("web" in attachment && attachment.web?.uri) return attachment.web.uri;
    if ("title" in attachment && attachment.title) return `think-${attachment.title}-${index}`;
    if ("name" in attachment && attachment.name) return `file-${attachment.name}-${index}`;
    if ("text" in attachment && attachment.text) return `text-${attachment.text.slice(0, 10)}-${index}`;
    return `attachment-${index}`;
};

export const getAttachmentText = (attachment: ChatAttachment): string => {
    if ("type" in attachment && attachment.type === 'file') {
        return attachment.name;
    } else if ("title" in attachment) {
        return attachment.title;
    } else if ("text" in attachment) {
        return attachment.text;
    } else if ("web" in attachment && attachment.web) {
        return attachment.web.title;
    }
    return "attachment";
};

const AttachmentsList = ({ attachments, setAttachments, variant = "standard" }: AttachmentsListProps) => {
    const isFullscreen = variant === "fullscreen";

    const removeAttachment = (attachment: ChatAttachment) => {
        setAttachments((prev) =>
            prev ? prev.filter((att) => att !== attachment) : []
        );
    };

    return (
        <div className={isFullscreen ? "px-4 pt-3" : "px-3 pt-2"}>
            <div className="flex items-center gap-2 overflow-auto pb-1.5">
                {attachments.map((attachment, index) => {
                    const text = getAttachmentText(attachment);
                    const key = getAttachmentKey(attachment, index);

                    return (
                        <div
                            key={key}
                            className={`flex items-center gap-2 bg-[var(--neutral-300)] rounded-lg flex-shrink-0 group ${
                                isFullscreen ? "px-3 py-1.5" : "px-2 py-1"
                            }`}
                        >
                            <span className={`font-medium truncate ${
                                isFullscreen ? "text-xs max-w-[120px]" : "text-[11px] max-w-[100px]"
                            }`}>
                                {text}
                            </span>
                            <button
                                onClick={() => removeAttachment(attachment)}
                                className="cursor-pointer text-[var(--neutral-500)] hover:text-red-500 transition-colors"
                                aria-label={`Remove ${text}`}
                                title={`Remove ${text}`}
                            >
                                <FiX className={isFullscreen ? "w-4 h-4" : "w-3 h-3"} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AttachmentsList;
