import React from "react"

import { FiLoader } from "react-icons/fi";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { Message } from "@/lib/types";

interface ChatMessagesProps {
    messages: Message[];
    isLoading: boolean;
}

const ChatMessages = ({ messages, isLoading}: ChatMessagesProps) => {
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
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                ))
            )}
            {/* Loading / thinking message */}
            {isLoading && (
                <div className="self-start bg-[var(--neutral-300)] text-[var(--foreground)] p-2 rounded-md mb-2 max-w-[70%] flex items-center space-x-2">
                    <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />
                    <span>Thinking...</span>
                </div>
            )}
        </>
    );
}

export default React.memo(ChatMessages);
