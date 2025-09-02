import { useState, useEffect, useRef } from "react";

import { FiSend } from "react-icons/fi";

import { Project, Message } from "@/lib/types";
import { ModalContents } from "../types";
import ChatMessages from "./chat_messages";

import { getResponse, getChatHistory } from "@/app/views/chat";

interface ChatPanelProps {
    project: Project;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
}

const ChatPanel = ({ project, setProject }: ChatPanelProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null); // New ref for the scrollable container

    const loadHistory = async () => {
        try {
            const history = await getChatHistory(project.id);
            // Assuming your getChatHistory function returns objects without an ID,
            // we add a unique ID here to make the list stable for React.
            const messagesWithIds = history.map((msg) => ({
                ...msg,
                id: crypto.randomUUID(),
            }));
            setMessages(messagesWithIds);
        } catch (err) {
            console.error("Error loading chat history:", err);
        }
    };

    const onSend = async () => {
        if (!input.trim()) return;

        const userInput = input.trim();
        const updatedMessages = [...messages, { content: userInput, isResponse: false, id: crypto.randomUUID() }];
        setMessages(updatedMessages);
        setInput("");

        try {
            setLoading(true);
            const MAX_HISTORY = 10;
            const recentMessages = updatedMessages.slice(-MAX_HISTORY);
            const response = await getResponse(userInput, recentMessages, project.id);
            const aiResponse = response.response;
            const newContent = response.newContent;
            setProject(prev => prev ? { ...prev, content: newContent } : null);

            setLoading(false);

            setMessages((prev) => [...prev, { content: aiResponse, isResponse: true, id: crypto.randomUUID() }]);
        } catch (err) {
            setLoading(false);
            console.error("Error fetching AI response:", err);
            setMessages((prev) => [...prev, { content: "Error generating response", isResponse: true, id: crypto.randomUUID() }]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    // Scroll to the bottom of the messages container whenever messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [messages]);

    // Load chat history on mount
    useEffect(() => {
        loadHistory();
    }, [project.id]);

    return (
        <div className="bg-[var(--neutral-200)] rounded-md p-3 flex flex-col h-[75vh] w-[50vw]">
            <h2 className="text-[var(--foreground)] text-xl font-semibold mb-2">Chat</h2>

            {/* This is the new scrollable container with the ref attached */}
            <div ref={messagesEndRef} className="flex-1 overflow-y-auto bg-[var(--neutral-100)] rounded-md p-2 mb-2 flex flex-col">
                <ChatMessages 
                    messages={messages}
                    isLoading={isLoading}
                />
            </div>

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
