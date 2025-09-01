import { useState, useEffect, useRef } from "react";

import { FiSend } from "react-icons/fi";
import { FiLoader } from "react-icons/fi";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { Project, Message} from "@/lib/types";
import { ModalContents } from "../types";

import { getResponse } from "@/app/views/chat"

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
    const [isLoading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const onSend = async () => {
        if (!input.trim()) return;

        const userInput = input.trim();
        // Create the updated messages array including the new user input
        const updatedMessages = [...messages, { content: userInput, isResponse: false }];
        setMessages(updatedMessages);
        setInput("");

        try {
            setLoading(true);
            const MAX_HISTORY = 10; // last 10 messages only

            const recentMessages = updatedMessages.slice(-MAX_HISTORY);
            const aiResponse = await getResponse(userInput, recentMessages, project.id);
            setLoading(false);

            setMessages((prev) => [...prev, { content: aiResponse, isResponse: true }]);
        } catch (err) {
            setLoading(false);
            console.error("Error fetching AI response:", err);
            setMessages((prev) => [...prev, { content: "Error generating response", isResponse: true }]);
        }
    };


    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); // prevent newline
            onSend();
        }
    };


    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="w-[50%] bg-[var(--neutral-200)] rounded-md p-3 flex flex-col h-[75vh]">
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
                <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="flex items-center bg-[var(--neutral-100)] rounded-md px-2 py-1">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent outline-none p-2 text-[var(--foreground)] resize-none max-h-100 overflow-y-auto"
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
