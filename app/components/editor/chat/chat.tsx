import { useState, useEffect, useRef } from "react";
import { FiSend, FiX } from "react-icons/fi";
import Button from "@/app/components/button";
import ChatMessages from "./chat_messages";

import { Project, Message } from "@/lib/types";
import { getResponse, getChatHistory } from "@/app/views/chat";

interface ChatPanelProps {
    project: Project;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    toggleChat: (open: boolean) => void;
}

const ChatPanel = ({ project, setProject, toggleChat}: ChatPanelProps) => {
    const [chatToggled, setChatToggled] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
            // NOTE: `allCards` is not returned by `getResponse`, this may cause an issue
            // const allCards = response.allCards; 
            if (newContent) {
                setProject(prev => prev ? { ...prev, content: newContent } : null);
            }
            // else if (allCards) {
            //     setProject(prev => prev ? { ...prev, cards: allCards } : null);
            // }

            setLoading(false);

            setMessages((prev) => [...prev, { content: aiResponse, isResponse: true, id: crypto.randomUUID() }]);
        } catch (err) {
            setLoading(false);
            console.error("Error fetching AI response:", err);
            setMessages((prev) => [...prev, { content: "I couldn't generate a response. Please again later", isResponse: true, id: crypto.randomUUID() }]);
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

    // NEW: Scroll to the bottom when the chat is opened
    useEffect(() => {
        if (chatToggled && messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [chatToggled]);

    // Load chat history on mount or when project ID changes
    useEffect(() => {
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

        loadHistory();
    }, [project.id]);

    return (
        <div className="transition-all duration-300">
            {chatToggled ? (
                <div className="bg-[var(--neutral-200)] rounded-md p-3 flex flex-col h-[75vh] w-[45vw]">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-[var(--foreground)] text-xl font-semibold">Chat</h2>
                        <FiX
                            size={24}
                            className="text-[var(--neutral-500)] cursor-pointer hover:text-[var(--foreground)]"
                            onClick={() => {
                                setChatToggled(false);
                                toggleChat(false);
                            }}
                        />
                    </div>
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
            ) : (
                <Button 
                    color="var(--accent-500)"
                    onClick={() => {
                        setChatToggled(true);
                        toggleChat(true);
                    }}
                >
                    Open chat
                </Button>
            )}
        </div>

    );
};

export default ChatPanel;
