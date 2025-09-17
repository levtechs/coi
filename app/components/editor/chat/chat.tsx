import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";

import { FiCircle, FiSend, FiX } from "react-icons/fi";
import { BsFillChatRightTextFill } from "react-icons/bs";

import Button from "@/app/components/button";
import ChatMessages from "./chat_messages";
import NewCardsPopup from "./new_cards_popup";

import { Project, Message, Card, StreamPhase } from "@/lib/types";
import { ModalContents } from "../types";

import { getChatHistory } from "@/app/views/chat";
import { sendMessage } from "./helpers";

interface ChatPanelProps {
    project: Project;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    setModalContents: (newContents: ModalContents) => void;
    setClickedCard: Dispatch<SetStateAction<Card | null>>;
}

const ChatPanel = ({ project, setProject, setModalContents, setClickedCard }: ChatPanelProps) => {
    const [chatToggled, setChatToggled] = useState(true);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    
    const [isLoading, setLoading] = useState(false);
    const [stream, setStream] = useState<string | null>(null);
    const [streamPhase, setStreamPhase] = useState<null | StreamPhase>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const setNewCards = (newCards: Card[]) => setModalContents({
        isOpen: true,
        type: "info",
        width: "3xl",
        children: <NewCardsPopup newCards={newCards} setClickedCard={setClickedCard}/>
    })

    const onSend = () => sendMessage(input, messages, project, addMessage, setStream, setNewCards, setStreamPhase, setProject, setInput, setLoading)

    const addMessage = (msg: Message) => {
        setMessages(prev => [
            ...prev,
            msg
        ]);
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!isLoading && e.key === "Enter" && !e.shiftKey) {
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
                <div className="bg-[var(--neutral-200)] rounded-md p-3 flex flex-col h-[100%] w-[45vw]">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-[var(--foreground)] text-xl font-semibold">Chat</h2>
                        <FiX
                            size={24}
                            className="text-[var(--neutral-500)] cursor-pointer hover:text-[var(--foreground)]"
                            onClick={() => {setChatToggled(false);}}
                        />
                    </div>
                    
                    {/* This is the new scrollable container with the ref attached */}
                    <div ref={messagesEndRef} className="flex-1 overflow-y-auto bg-[var(--neutral-100)] rounded-md p-2 mb-2 flex flex-col">
                        <ChatMessages 
                            messages={messages}
                            stream={stream}
                            isLoading={isLoading}
                            phase={streamPhase}
                        />
                    </div>

                    {/* Input box */}
                    <div className="flex items-center bg-[var(--neutral-100)] rounded-md px-2 py-1">
                        {!isLoading ? (
                            <>
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
                            </>
                        ) : (
                            <>
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 bg-transparent outline-none p-2 text-[var(--foreground)] resize-none max-h-100 overflow-y-auto"
                                />
                                <FiCircle
                                    size={20}
                                    className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                                />
                            </>
                        )}

                    </div>
                </div>
            ) : (
                <div className="absolute top-0 right-2 m-4"> 
                    <BsFillChatRightTextFill 
                        className="text-[var(--accent-400)] text-xl cursor-pointer"
                        onClick={() => {setChatToggled(true)}}
                    />
                </div>
            )}
        </div>
    );
};

export default ChatPanel;