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
                    <ChatMessage key={msg.id} content={msg.content} isResponse={msg.isResponse} />
                ))
            )}
            {/* Partial / stream message */}
            {stream && <ChatMessage content={stream} isResponse={true}/>}
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

interface ChatMessageParams {
    content: string, 
    isResponse: boolean, 
}

const ChatMessage = ({ content, isResponse }: ChatMessageParams) => {
    return (
        <div
            className={`p-2 mt-4 rounded-md break-words prose prose-sm
                ${isResponse
                    ? "self-start max-w-[100%] text-[var(--foreground)]"
                    : "self-end max-w-[70%] bg-[var(--accent-400)] text-[var(--foreground)]"
                }`}
        >
            {isResponse ? (
                <div className="p-4">
                    <MarkdownArticle markdown={content} singleLine={false}/>
                </div>
            ) : (content)}
        </div>
    )
}
