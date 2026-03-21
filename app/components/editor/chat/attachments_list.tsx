"use client";

import { FileText, Paperclip, Globe, Brain, Layout, X, Play } from "lucide-react";
import { ChatAttachment } from "@/lib/types";
import { Dispatch, SetStateAction } from "react";

interface AttachmentsListProps {
    attachments: ChatAttachment[];
    setAttachments: Dispatch<SetStateAction<ChatAttachment[] | null>>;
    variant?: "fullscreen" | "standard";
}

export const getAttachmentIcon = (attachment: ChatAttachment) => {
    if ("type" in attachment && attachment.type === 'file') {
        return <Paperclip className="w-3 h-3" />;
    } else if ("type" in attachment && attachment.type === 'sources') {
        return <Globe className="w-3 h-3" />;
    } else if ("web" in attachment) {
        const uri = attachment.web.uri.toLowerCase();
        const title = attachment.web.title.toLowerCase();
        const isYoutube = uri.includes('youtube.com') || 
                          uri.includes('youtu.be') || 
                          title.includes('youtube.com') || 
                          title.includes('youtube');
        if (isYoutube) {
            return <Play className="w-3 h-3 fill-current" />;
        }
        return <Globe className="w-3 h-3" />;

    } else if ("time" in attachment) {
        return <Brain className="w-3 h-3" />;
    } else if ("children" in attachment || ("type" in attachment && (attachment.type === 'subcontent' || attachment.type === 'card'))) {
        return <Layout className="w-3 h-3" />;
    } else if ("url" in attachment && attachment.url) {
        const url = attachment.url.toLowerCase();
        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
        if (isYoutube) {
            return <Play className="w-3 h-3 fill-current" />;
        }
        return <Globe className="w-3 h-3" />;
    } else if ("kind" in attachment && attachment.kind === "resource") {
        return <Globe className="w-3 h-3" />;
    } else if ("details" in attachment) {
        return <FileText className="w-3 h-3" />;
    }
    return <Paperclip className="w-3 h-3" />;
};

export const getAttachmentKey = (attachment: ChatAttachment, index: number): string => {
    if ("id" in attachment && attachment.id) return attachment.id;
    if ("web" in attachment && attachment.web?.uri) return attachment.web.uri;
    if ("type" in attachment && attachment.type === 'sources') return `sources-${index}`;
    if ("title" in attachment && attachment.title) return `think-${attachment.title}-${index}`;
    if ("name" in attachment && attachment.name) return `file-${attachment.name}-${index}`;
    if ("text" in attachment && attachment.text) return `text-${attachment.text.slice(0, 10)}-${index}`;
    return `attachment-${index}`;
};

export const getAttachmentText = (attachment: ChatAttachment): string => {
    if ("type" in attachment && attachment.type === 'file') {
        return attachment.name;
    } else if ("type" in attachment && attachment.type === 'sources') {
        return `${attachment.chunks.length} Source${attachment.chunks.length === 1 ? '' : 's'}`;
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[var(--neutral-200)] text-[var(--neutral-700)] border border-[var(--neutral-300)] transition-colors group ${
                                isFullscreen ? "px-4 py-1.5" : ""
                            }`}
                        >
                            <span className="shrink-0 text-[var(--neutral-500)]">
                                {getAttachmentIcon(attachment)}
                            </span>
                            <span className={`truncate ${
                                isFullscreen ? "text-xs max-w-[150px]" : "text-[11px] max-w-[120px]"
                            }`}>
                                {text}
                            </span>
                            <button
                                onClick={() => removeAttachment(attachment)}
                                className="cursor-pointer text-[var(--neutral-400)] hover:text-red-500 transition-colors ml-1"
                                aria-label={`Remove ${text}`}
                                title={`Remove ${text}`}
                            >
                                <X className={isFullscreen ? "w-3.5 h-3.5" : "w-3 h-3"} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AttachmentsList;
