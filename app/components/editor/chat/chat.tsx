import { useState, useEffect, useRef } from "react";

import { FiSend } from "react-icons/fi";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { Project } from "@/lib/projects";
import { ModalContents } from "../types";
import { Message } from "./types";

interface ChatPanelProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    setContent: (uid: string, projectId: string, newContent: string) => Promise<void>;
    setModalContents: (newContent: ModalContents) => void;
}

const ChatPanel = ({ project, user, setProject, setContent, setModalContents }: ChatPanelProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const onSend = () => {
        if (!input.trim()) return;

        // Add new message locally
        setMessages((prev) => [...prev, { content: input.trim(), isResponse: false }]);
        setInput("");

        // Example: simulate a response after 1s
        setTimeout(() => {
            setMessages((prev) => [...prev, { content: "this is a response", isResponse: true }]);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onSend();
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="w-[50%] bg-[var(--neutral-200)] rounded-md p-3 flex flex-col h-[500px]">
            <h2 className="text-[var(--foreground)] text-xl font-semibold mb-2">Chat</h2>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto bg-[var(--neutral-100)] rounded-md p-2 mb-2 flex flex-col">
                {messages.length === 0 ? (
                    <p className="text-[var(--neutral-500)] text-sm">No messages yet</p>
                ) : (
                    messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`p-2 rounded-md mb-2 max-w-[70%] break-words prose prose-sm
                            ${msg.isResponse
                                ? "self-start bg-[var(--neutral-300)] text-[var(--foreground)]"
                                : "self-end bg-[var(--accent-200)] text-white"
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
                <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="flex items-center bg-[var(--neutral-100)] rounded-md px-2 py-1">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent outline-none p-2 text-[var(--foreground)]"
                />
                <FiSend
                    size={20}
                    onClick={onSend}
                    className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                />
            </div>
        </div>
    );
};

export default ChatPanel;
