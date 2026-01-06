import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";

import { FiCircle, FiSend, FiX, FiSettings, FiMaximize, FiMinimize } from "react-icons/fi";
import { BsFillChatRightTextFill } from "react-icons/bs";
import { MdFileUpload } from "react-icons/md";

import ChatMessages from "./chat_messages";
import NewCardsPopup from "./new_cards_popup";
import ChatPreferencesPanel from "./chat_preferences_panel";


import { Project, Message, Card, StreamPhase, ChatAttachment, ChatPreferences } from "@/lib/types";
import { ModalContents, noModal } from "../types";

import { getChatHistory, getUserPreferences } from "@/app/views/chat";
import { sendMessage } from "./helpers";
import { uploadFile } from "@/app/views/uploads";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/uploadConstants";

interface ChatPanelProps {
    project: Project;
    setModalContents: (newContents: ModalContents) => void;
    attachments: null | ChatAttachment[]
    setAttachments: Dispatch<SetStateAction<ChatAttachment[] | null>>;
    addFileAttachment: (attachment: ChatAttachment) => void;
    setClickedCard: Dispatch<SetStateAction<Card | null>>;
    onFullscreenChange?: (isFullscreen: boolean) => void;
}

const ChatPanel = ({ project, setModalContents, attachments, setAttachments, addFileAttachment, setClickedCard, onFullscreenChange }: ChatPanelProps) => {
    const [chatToggled, setChatToggled] = useState(true);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");

    const [isLoading, setLoading] = useState(false);
    const [streamPhase, setStreamPhase] = useState<null | StreamPhase>(null);

    const [showPreferences, setShowPreferences] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);


    const [preferences, setPreferences] = useState<ChatPreferences>({
        model: "normal",
        thinking: "auto",
        googleSearch: "auto",
        forceCardCreation: "auto",
        personality: "default",
        followUpQuestions: "auto",
        generationModel: "flash",
    });

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const setNewCards = (newCards: Card[]) => setModalContents({
        isOpen: true,
        type: "info",
        width: "3xl",
        children: <NewCardsPopup newCards={newCards} setClickedCard={setClickedCard} projectId={project.id}/>
    })

    const onSend = () => sendMessage(input, messages, attachments, project, preferences, addMessage, setNewCards, setStreamPhase, setInput, setLoading, setMessages)

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

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file && ALLOWED_MIME_TYPES.some(type => file.type.startsWith(type))) {
                    files.push(file);
                }
            }
        }
        if (files.length === 0) return;
        const MAX_FILES = 10;
        if (files.length > MAX_FILES) {
            setModalContents({
                isOpen: true,
                type: "error",
                width: "sm",
                message: `Too many files. Maximum ${MAX_FILES} files allowed.`,
                onClose: () => setModalContents(noModal),
            });
            e.preventDefault();
            return;
        }
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        const currentSize = (attachments || []).reduce((sum, att) => {
            if ('type' in att && att.type === 'file') {
                return sum + att.size;
            }
            return sum;
        }, 0);
        if (currentSize + totalSize > MAX_UPLOAD_SIZE_BYTES) {
            setModalContents({
                isOpen: true,
                type: "error",
                width: "sm",
                message: `Total attachment size would exceed ${MAX_UPLOAD_SIZE_MB}MB. Please remove some attachments.`,
                onClose: () => setModalContents(noModal),
            });
            e.preventDefault();
            return;
        }
        for (const file of files) {
            if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                setModalContents({
                    isOpen: true,
                    type: "error",
                    width: "sm",
                    message: `File size exceeds the limit of ${MAX_UPLOAD_SIZE_MB}MB`,
                    onClose: () => setModalContents(noModal),
                });
                continue;
            }
            uploadFile(file, project.id).then(addFileAttachment).catch((error) => {
                console.error('Upload failed:', error);
                setModalContents({
                    isOpen: true,
                    type: "error",
                    width: "sm",
                    message: error instanceof Error ? error.message : 'Upload failed.',
                    onClose: () => setModalContents(noModal),
                });
            });
        }
        e.preventDefault();
    };
    
    // NEW: Scroll to the bottom when the chat is opened or mounted
    useEffect(() => {
        if (chatToggled && messagesEndRef.current) {
            messagesEndRef.current.scrollTo({
                top: messagesEndRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [chatToggled, messages]);

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

    // Load user preferences on mount
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const savedPreferences = await getUserPreferences();
                if (savedPreferences) {
                    setPreferences(savedPreferences);
                }
            } catch (err) {
                console.error("Error loading user preferences:", err);
            }
        };

        loadPreferences();
    }, []);

    // Notify parent when fullscreen state changes
    useEffect(() => {
        onFullscreenChange?.(isFullscreen);
    }, [isFullscreen, onFullscreenChange]);

    return (
        <div className={`transition-all duration-300 ${isFullscreen ? 'absolute inset-0 z-50 bg-[var(--neutral-100)]' : ''}`}>
            {chatToggled ? (
                <div className={`bg-[var(--neutral-200)] rounded-md p-3 flex flex-col h-[100%] ${isFullscreen ? 'w-full' : 'w-[45vw]'}`}>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-[var(--foreground)] text-xl font-semibold">Chat</h2>
                        <div className="flex items-center gap-2">
                            <FiSettings
                                size={20}
                                className={`text-[var(--neutral-500)] cursor-pointer hover:text-[var(--foreground)] ${showPreferences ? 'text-[var(--accent-500)]' : ''}`}
                                onClick={() => setShowPreferences(!showPreferences)}
                            />
                            {isFullscreen ? (
                                <FiMinimize
                                    size={20}
                                    className="text-[var(--neutral-500)] cursor-pointer hover:text-[var(--foreground)]"
                                    onClick={() => setIsFullscreen(false)}
                                />
                            ) : (
                                <FiMaximize
                                    size={20}
                                    className="text-[var(--neutral-500)] cursor-pointer hover:text-[var(--foreground)]"
                                    onClick={() => setIsFullscreen(true)}
                                />
                            )}
                            <FiX
                                size={24}
                                className="text-[var(--neutral-500)] cursor-pointer hover:text-[var(--foreground)]"
                                onClick={() => {setChatToggled(false);}}
                            />
                        </div>
                    </div>

                    {/* Preferences Panel */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPreferences ? 'max-h-96 mb-2' : 'max-h-0'}`}>
                        <ChatPreferencesPanel
                            preferences={preferences}
                            onPreferencesChange={setPreferences}
                        />
                    </div>

                    {/* This is the new scrollable container with the ref attached */}
                     <div ref={messagesEndRef} className="flex-1 overflow-y-auto bg-[var(--neutral-100)] rounded-md p-2 mb-2 flex flex-col min-h-0">
                        <ChatMessages
                            messages={messages}
                            isLoading={isLoading}
                            phase={streamPhase}
                            cards={project.cards}
                            onFollowUpClick={setInput}
                        />
                    </div>


                     {/* Input box */}
                     <div className="flex flex-col bg-[var(--neutral-100)] rounded-md px-2 py-2">

                        {/* Attachments */}
                        {attachments && attachments.length > 0 && (
                            <div>
                                <p className="text-sm p-1">Asking about:</p>
                                <div className="flex items-center gap-2 overflow-auto py-1">
                                    {attachments.map((attachment: ChatAttachment) => {
                                        // Determine display text based on type
                                        let text: string;
                                        if ("type" in attachment && attachment.type === 'file') {
                                            text = attachment.name;
                                        } else if ("title" in attachment) {
                                            text = attachment.title;
                                        } else if ("text" in attachment) {
                                            text = attachment.text;
                                        } else {
                                            text = "attachment details not found";
                                        }

                                        return (
                                            <div
                                                key={"id" in attachment ? attachment.id : crypto.randomUUID()}
                                                className="flex items-center justify-between w-32 h-8 bg-[var(--neutral-300)] rounded flex-shrink-0"
                                            >
                                                <p className="truncate ml-2 text-sm">{text}</p>
                                                <FiX
                                                    onClick={() =>
                                                        setAttachments((prev) =>
                                                            prev ? prev.filter((att) => att !== attachment) : []
                                                        )
                                                    }
                                                    className="ml-2 h-[75%] w-[75%] cursor-pointer rounded transition-colors"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-row items-center "> 
                            {!isLoading ? (
                                <>
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onPaste={handlePaste}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent outline-none p-2 text-[var(--foreground)] resize-none max-h-100 overflow-y-auto"
                                    />
                                    <div className="flex flex-col gap-2">
                                        <FiSend
                                            size={20}
                                            onClick={onSend}
                                            className="text-[var(--neutral-500)] hover:text-[var(--accent-600)] cursor-pointer"
                                        />
                                        <MdFileUpload
                                            size={20}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-[var(--neutral-500)] hover:text-[var(--accent-600)] cursor-pointer"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onPaste={handlePaste}
                                        className="flex-1 bg-transparent outline-none p-2 text-[var(--foreground)] resize-none max-h-100 overflow-y-auto"
                                    />
                                    <FiCircle
                                        size={20}
                                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                                    />
                                </>
                            )}
                         </div>
                          <input
                              type="file"
                              ref={fileInputRef}
                              accept={ALLOWED_MIME_TYPES.map(type => type.endsWith('/') ? type + '*' : type).join(',')}
                              style={{ display: 'none' }}
                              onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                     // Validate file type
                                     if (!ALLOWED_MIME_TYPES.some(type => file.type.startsWith(type))) {
                                         setModalContents({
                                             isOpen: true,
                                             type: "error",
                                             width: "sm",
                                             message: `File type ${file.type} not allowed. Only images and documents are permitted.`,
                                             onClose: () => setModalContents(noModal),
                                         });
                                         return;
                                     }

                                     // Validate total size
                                     const currentSize = (attachments || []).reduce((sum, att) => {
                                         if ('type' in att && att.type === 'file') {
                                             return sum + att.size;
                                         }
                                         return sum;
                                     }, 0);
                                     if (currentSize + file.size > MAX_UPLOAD_SIZE_BYTES) {
                                         setModalContents({
                                             isOpen: true,
                                             type: "error",
                                             width: "sm",
                                             message: `Total attachment size would exceed ${MAX_UPLOAD_SIZE_MB}MB. Please remove some attachments.`,
                                             onClose: () => setModalContents(noModal),
                                         });
                                         return;
                                     }

                                     try {
                                         const attachment = await uploadFile(file, project.id);
                                         addFileAttachment(attachment);
                                     } catch (error) {
                                         console.error('Upload failed:', error);
                                         setModalContents({
                                             isOpen: true,
                                             type: "error",
                                             width: "sm",
                                             message: error instanceof Error ? error.message : 'Upload failed.',
                                             onClose: () => setModalContents(noModal),
                                         });
                                     }
                                 }
                             }}
                         />
                     </div>
                 </div>
            ) : (
                <div className="absolute top-12 right-2 m-4"> 
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
