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
import { sendMessage, sendQuickCreateMessage } from "./helpers";
import { uploadFile } from "@/app/views/uploads";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/uploadConstants";
import { validateAndUploadFiles } from '@/lib/uploadUtils';

interface ChatPanelProps {
    project: Project;
    setModalContents: (newContents: ModalContents) => void;
    attachments: null | ChatAttachment[]
    setAttachments: Dispatch<SetStateAction<ChatAttachment[] | null>>;
    addFileAttachment: (attachment: ChatAttachment) => void;
    setClickedCard: Dispatch<SetStateAction<Card | null>>;
    onFullscreenChange?: (isFullscreen: boolean) => void;
    /** When provided, auto-sends the initial message via the quick create flow */
    quickCreate?: {
        message: string;
        attachments: ChatAttachment[] | null;
        preferences: ChatPreferences;
        onProjectCreated: (projectId: string) => void;
    };
}

const ChatPanel = ({ project, setModalContents, attachments, setAttachments, addFileAttachment, setClickedCard, onFullscreenChange, quickCreate }: ChatPanelProps) => {
    const [chatToggled, setChatToggled] = useState(true);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");

    const [isLoading, setLoading] = useState(false);
    const [streamPhase, setStreamPhase] = useState<null | StreamPhase>(null);

    const [showPreferences, setShowPreferences] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Close preferences when clicking outside
    const preferencesRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (preferencesRef.current && !preferencesRef.current.contains(event.target as Node)) {
                setShowPreferences(false);
            }
        };
        if (showPreferences) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showPreferences]);


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
        children: <NewCardsPopup newCards={newCards} setClickedCard={setClickedCard} projectId={project.id} courseLesson={project.courseLesson} courseId={project.courseId}/>
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

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
        e.preventDefault();

        // Check total size including existing attachments
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
            return;
        }

        await validateAndUploadFiles(files, {
            projectId: project.id,
            onError: (message) => setModalContents({
                isOpen: true,
                type: "error",
                width: "sm",
                message,
                onClose: () => setModalContents(noModal),
            }),
            onFileError: (_, message) => setModalContents({
                isOpen: true,
                type: "error",
                width: "sm",
                message,
                onClose: () => setModalContents(noModal),
            }),
            onSuccess: addFileAttachment,
        });
    };
    
    // NEW: Scroll to the bottom when the chat is opened or mounted
    useEffect(() => {
        if (chatToggled && messagesEndRef.current) {
            messagesEndRef.current.scrollTo({
                top: messagesEndRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [chatToggled, messages.length]);

    // Load chat history on mount or when project ID changes
    // Skip for quick create - there's no history for a new project
    useEffect(() => {
        if (quickCreate) return;

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
    }, [project.id, quickCreate]);

    // Load user preferences on mount
    // For quick create, use the provided preferences instead
    useEffect(() => {
        if (quickCreate) {
            setPreferences(quickCreate.preferences);
            return;
        }

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
    }, [quickCreate]);

    // Quick create: auto-send the initial message on mount
    const quickCreateTriggered = useRef(false);
    useEffect(() => {
        if (!quickCreate || quickCreateTriggered.current) return;
        quickCreateTriggered.current = true;

        sendQuickCreateMessage(
            quickCreate.message,
            quickCreate.attachments,
            quickCreate.preferences,
            addMessage,
            setNewCards,
            setStreamPhase,
            setLoading,
            setMessages,
            quickCreate.onProjectCreated,
        );
    }, [quickCreate]);

    // Notify parent when fullscreen state changes
    useEffect(() => {
        onFullscreenChange?.(isFullscreen);
    }, [isFullscreen, onFullscreenChange]);

    return (
        <div className={`transition-all duration-300 ${isFullscreen ? 'absolute inset-0 z-50 bg-[var(--neutral-100)]' : ''}`}>
            {chatToggled ? (
                isFullscreen ? (
                    <div className="flex flex-col h-full w-full">
                        {/* Modern Fullscreen Header */}
                        <div className="flex justify-between items-center px-8 py-4 border-b border-transparent bg-transparent relative">
                            <div className="flex items-center gap-4">
                                <h2 className="text-[var(--foreground)] text-xl font-bold opacity-80">{project.title}</h2>
                                <span className="px-2 py-0.5 rounded bg-[var(--accent-100)] text-[var(--accent-700)] text-[10px] font-bold uppercase tracking-widest">Assistant</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setShowPreferences(!showPreferences)}
                                    className={`p-2 rounded-lg transition-colors hover:bg-[var(--neutral-200)] ${showPreferences ? 'text-[var(--accent-500)] bg-[var(--neutral-200)]' : 'text-[var(--neutral-500)]'}`}
                                >
                                    <FiSettings size={22} />
                                </button>
                                <button 
                                    onClick={() => setIsFullscreen(false)}
                                    className="p-2 rounded-lg transition-colors hover:bg-[var(--neutral-200)] text-[var(--neutral-500)]"
                                >
                                    <FiMinimize size={22} />
                                </button>
                                
                                {/* Modern Popup Settings */}
                                {showPreferences && (
                                    <div ref={preferencesRef} className="absolute right-8 top-[100%] mt-2 z-[60] shadow-2xl animate-in fade-in zoom-in duration-200">
                                        <div className="w-80 p-1 bg-white dark:bg-[var(--neutral-100)] rounded-xl border border-[var(--neutral-200)] shadow-2xl">
                                            <div className="p-4 bg-[var(--neutral-100)] rounded-xl">
                                                <h3 className="text-sm font-bold mb-4 px-1">Chat Settings</h3>
                                                <ChatPreferencesPanel
                                                    preferences={preferences}
                                                    onPreferencesChange={setPreferences}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div ref={messagesEndRef} className="flex-1 overflow-y-auto pt-4 pb-2">
                            <div className="max-w-5xl mx-auto px-8">
                                <ChatMessages
                                    messages={messages}
                                    isLoading={isLoading}
                                    phase={streamPhase}
                                    cards={project.cards}
                                    onFollowUpClick={setInput}
                                />
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="pb-6 pt-2">
                            <div className="max-w-5xl mx-auto px-8">
                                <div className="flex flex-col bg-[var(--neutral-200)] rounded-2xl shadow-sm border border-[var(--neutral-300)] focus-within:border-[var(--accent-400)] transition-all overflow-hidden">
                                    {/* Attachments */}
                                    {attachments && attachments.length > 0 && (
                                        <div className="px-4 pt-3">
                                            <div className="flex items-center gap-2 overflow-auto pb-2">
                                                {attachments.map((attachment: ChatAttachment) => {
                                                    let text: string;
                                                    if ("type" in attachment && attachment.type === 'file') {
                                                        text = attachment.name;
                                                    } else if ("title" in attachment) {
                                                        text = attachment.title;
                                                    } else if ("text" in attachment) {
                                                        text = attachment.text;
                                                    } else {
                                                        text = "attachment";
                                                    }

                                                    return (
                                                        <div
                                                            key={"id" in attachment ? attachment.id : crypto.randomUUID()}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--neutral-300)] rounded-lg flex-shrink-0 group"
                                                        >
                                                            <span className="text-xs font-medium truncate max-w-[120px]">{text}</span>
                                                            <FiX
                                                                onClick={() =>
                                                                    setAttachments((prev) =>
                                                                        prev ? prev.filter((att) => att !== attachment) : []
                                                                    )
                                                                }
                                                                className="cursor-pointer text-[var(--neutral-500)] hover:text-red-500 transition-colors"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-end p-2 gap-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 text-[var(--neutral-500)] hover:text-[var(--accent-500)] hover:bg-[var(--neutral-300)] rounded-xl transition-all mb-1"
                                            title="Upload file"
                                        >
                                            <MdFileUpload size={22} />
                                        </button>
                                        
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onPaste={handlePaste}
                                            placeholder="Message assistant..."
                                            className="flex-1 bg-transparent outline-none py-3 px-2 text-[var(--foreground)] resize-none max-h-[40vh] min-h-[44px]"
                                            rows={1}
                                            style={{ height: 'auto' }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = `${target.scrollHeight}px`;
                                            }}
                                        />

                                        <button
                                            onClick={onSend}
                                            disabled={isLoading || !input.trim()}
                                            className={`p-2.5 rounded-xl transition-all mb-1 ${
                                                !isLoading && input.trim() 
                                                ? 'bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] shadow-md' 
                                                : 'text-[var(--neutral-400)] cursor-not-allowed'
                                            }`}
                                        >
                                            {isLoading ? (
                                                <FiCircle className="animate-spin" size={18} />
                                            ) : (
                                                <FiSend size={18} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-center mt-2 text-[var(--neutral-500)]">
                                    Assistant can make mistakes. Check important info.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={`bg-[var(--neutral-200)] rounded-xl p-2 flex flex-col h-[100%] w-[45vw] shadow-sm border border-[var(--neutral-300)]`}>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2 relative px-2 py-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-[var(--foreground)] text-base font-bold opacity-90 tracking-tight">Chat</h2>
                                <span className="px-1.5 py-0.5 rounded bg-[var(--accent-100)] text-[var(--accent-700)] text-[9px] font-bold uppercase tracking-wider">AI</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setShowPreferences(!showPreferences)}
                                    className={`p-1.5 rounded-lg transition-colors hover:bg-[var(--neutral-300)] ${showPreferences ? 'text-[var(--accent-500)] bg-[var(--neutral-300)]' : 'text-[var(--neutral-500)]'}`}
                                >
                                    <FiSettings size={16} />
                                </button>
                                <button 
                                    onClick={() => setIsFullscreen(true)}
                                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--neutral-300)] text-[var(--neutral-500)]"
                                >
                                    <FiMaximize size={16} />
                                </button>
                                <button 
                                    onClick={() => setChatToggled(false)}
                                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--neutral-300)] text-[var(--neutral-500)]"
                                >
                                    <FiX size={18} />
                                </button>

                                {/* Standard Mode Popup Settings */}
                                {showPreferences && (
                                    <div ref={preferencesRef} className="absolute right-0 top-[100%] mt-2 z-[60] shadow-2xl animate-in fade-in zoom-in duration-150">
                                        <div className="w-72 p-1 bg-white dark:bg-[var(--neutral-100)] rounded-xl border border-[var(--neutral-300)] shadow-2xl">
                                            <div className="p-3 bg-[var(--neutral-100)] rounded-xl">
                                                <h3 className="text-xs font-bold mb-3 px-1 opacity-70 uppercase tracking-wider">Preferences</h3>
                                                <ChatPreferencesPanel
                                                    preferences={preferences}
                                                    onPreferencesChange={setPreferences}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Message container */}
                         <div ref={messagesEndRef} className="flex-1 overflow-y-auto bg-[var(--neutral-100)] rounded-xl p-2 mb-2 flex flex-col min-h-0 border border-[var(--neutral-300)]/50">
                            <div className="px-1">
                                <ChatMessages
                                    messages={messages}
                                    isLoading={isLoading}
                                    phase={streamPhase}
                                    cards={project.cards}
                                    onFollowUpClick={setInput}
                                />
                            </div>
                        </div>

                         {/* Input Area */}
                         <div className="flex flex-col bg-[var(--neutral-100)] rounded-xl shadow-sm border border-[var(--neutral-300)] focus-within:border-[var(--accent-400)] transition-all overflow-hidden">
                            {/* Attachments */}
                            {attachments && attachments.length > 0 && (
                                <div className="px-3 pt-2">
                                    <div className="flex items-center gap-2 overflow-auto pb-1">
                                        {attachments.map((attachment: ChatAttachment) => {
                                            let text: string;
                                            if ("type" in attachment && attachment.type === 'file') {
                                                text = attachment.name;
                                            } else if ("title" in attachment) {
                                                text = attachment.title;
                                            } else if ("text" in attachment) {
                                                text = attachment.text;
                                            } else {
                                                text = "attachment";
                                            }

                                            return (
                                                <div
                                                    key={"id" in attachment ? attachment.id : crypto.randomUUID()}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-[var(--neutral-300)] rounded-lg flex-shrink-0"
                                                >
                                                    <span className="text-[11px] font-medium truncate max-w-[100px]">{text}</span>
                                                    <FiX
                                                        onClick={() =>
                                                            setAttachments((prev) =>
                                                                prev ? prev.filter((att) => att !== attachment) : []
                                                            )
                                                        }
                                                        className="cursor-pointer text-[var(--neutral-500)] hover:text-red-500 transition-colors w-3 h-3"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-end p-1.5 gap-1"> 
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 text-[var(--neutral-500)] hover:text-[var(--accent-500)] hover:bg-[var(--neutral-200)] rounded-lg transition-all mb-0.5"
                                >
                                    <MdFileUpload size={18} />
                                </button>
                                
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    placeholder="Ask anything..."
                                    className="flex-1 bg-transparent outline-none py-1.5 px-1 text-[var(--foreground)] text-sm resize-none max-h-40 overflow-y-auto"
                                    rows={1}
                                    style={{ height: 'auto' }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${target.scrollHeight}px`;
                                    }}
                                />

                                <button
                                    onClick={onSend}
                                    disabled={isLoading || !input.trim()}
                                    className={`p-1.5 rounded-lg transition-all mb-0.5 ${
                                        !isLoading && input.trim() 
                                        ? 'bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] shadow-sm' 
                                        : 'text-[var(--neutral-400)] cursor-not-allowed'
                                    }`}
                                >
                                    {isLoading ? (
                                        <FiCircle className="animate-spin" size={16} />
                                    ) : (
                                        <FiSend size={16} />
                                    )}
                                </button>
                             </div>
                         </div>
                     </div>
                )
            ) : (
                <div className="absolute top-12 right-2 m-4"> 
                    <BsFillChatRightTextFill 
                        className="text-[var(--accent-400)] text-xl cursor-pointer"
                        onClick={() => {setChatToggled(true)}}
                    />
                </div>
            )}
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
    );
};

export default ChatPanel;
