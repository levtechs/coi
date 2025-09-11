import React from "react"

import { FiLoader } from "react-icons/fi";

import { Message, StreamPhase } from "@/lib/types";

import MarkdownArticle from "../../md";

interface ChatMessagesProps {
    messages: Message[];
    stream: string | null;
    isLoading: boolean;
    phase: null | StreamPhase;
}

const ChatMessages = ({ messages, stream, isLoading, phase}: ChatMessagesProps) => {
    
    const phaseMessages: Record<string, string> = {
        starting: "Starting...",
        streaming: "Explaining...",
        processing: "Thinking...",
        "generating content": "Making notes...",
        "generating cards": "Making cards...",
    };

    return (
        <>
            {messages.length === 0 ? (
                <p className="text-[var(--neutral-500)] text-sm">No messages yet</p>
            ) : (
                messages.map((msg) => (
                    <div
                        key={msg.id} // <-- Use the unique ID here
                        className={`p-2 rounded-md mb-2 max-w-[70%] break-words prose prose-sm
                            ${msg.isResponse
                                ? "self-start bg-[var(--neutral-300)] text-[var(--foreground)]"
                                : "self-end bg-[var(--accent-400)] text-white"
                            }`}
                    >
                        {msg.isResponse ? (<MarkdownArticle markdown={msg.content} />) : (msg.content)}
                    </div>
                ))
            )}
            {/* Partial / stream message */}
            {stream && (
                <div className="self-start bg-[var(--neutral-300)] text-[var(--foreground)] p-2 rounded-md mb-2 max-w-[70%] flex items-center space-x-2">
                    <MarkdownArticle markdown={stream} />
                </div>
            )}
            {/* Loading / thinking message */}
            {isLoading && (
                <div className="self-start bg-[var(--neutral-300)] text-[var(--foreground)] p-2 rounded-md mb-2 max-w-[70%] flex items-center space-x-2">
                    <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />
                    <span>{phase ? phaseMessages[phase] : "Thinking..."}</span>
                </div>
            )}
        </>
    );
}

export default React.memo(ChatMessages);
