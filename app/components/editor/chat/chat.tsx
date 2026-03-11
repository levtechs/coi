import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from "react";

import { FiCircle, FiSend, FiX, FiSettings, FiMaximize, FiMinimize } from "react-icons/fi";
import { BsFillChatRightTextFill } from "react-icons/bs";
import { MdFileUpload } from "react-icons/md";

import ChatMessages from "./chat_messages";
import NewCardsPopup from "./new_cards_popup";
import ChatPreferencesPanel from "./chat_preferences_panel";
import AttachmentsList from "./attachments_list";

import { Project, Message, Card, StreamPhase, ChatAttachment, ChatPreferences } from "@/lib/types";
import { ModalContents, noModal } from "../types";

import { getChatHistory, getUserPreferences } from "@/app/views/chat";
import { sendMessage, sendQuickCreateMessage } from "./helpers";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/uploadConstants";
import { validateAndUploadFiles } from '@/lib/uploadUtils';
import { useAutoResize } from "@/app/hooks/use-auto-resize";
import { useOnClickOutside } from "@/app/hooks/use-on-click-outside";

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

    // Auto-resize for textarea
    const { textareaRef } = useAutoResize(input);

    // Close preferences when clicking outside
    const preferencesRef = useRef<HTMLDivElement>(null);
    const closePreferences = useCallback(() => setShowPreferences(false), []);
    useOnClickOutside(preferencesRef, closePreferences, showPreferences);


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

    // --- Variant-aware style config ---
    const variant = isFullscreen ? 'fullscreen' : 'standard';
    const sz = isFullscreen
        ? { icon: 22, iconSm: 18, btnPad: 'p-2', btnRound: 'rounded-lg', hoverBg: 'hover:bg-[var(--neutral-200)]', activeBg: 'bg-[var(--neutral-200)]' }
        : { icon: 16, iconSm: 16, btnPad: 'p-1.5', btnRound: 'rounded-lg', hoverBg: 'hover:bg-[var(--neutral-300)]', activeBg: 'bg-[var(--neutral-300)]' };

    // --- Shared sub-renders ---
    const preferencesPopup = showPreferences && (
        <div
            ref={preferencesRef}
            className={`absolute ${isFullscreen ? 'right-8' : 'right-0'} top-[100%] mt-2 z-[60] shadow-2xl transition transform ${isFullscreen ? 'duration-200' : 'duration-150'} ease-out origin-top-right`}
        >
            <div className={`${isFullscreen ? 'w-80' : 'w-72'} p-1 bg-white dark:bg-[var(--neutral-100)] rounded-xl border border-[var(--neutral-${isFullscreen ? '200' : '300'})] shadow-2xl`}>
                <div className={`${isFullscreen ? 'p-4' : 'p-3'} bg-[var(--neutral-100)] rounded-xl`}>
                    <h3 className={`${isFullscreen ? 'text-sm font-bold mb-4 px-1' : 'text-xs font-bold mb-3 px-1 opacity-70 uppercase tracking-wider'}`}>
                        {isFullscreen ? 'Chat Settings' : 'Preferences'}
                    </h3>
                    <ChatPreferencesPanel
                        preferences={preferences}
                        onPreferencesChange={setPreferences}
                    />
                </div>
            </div>
        </div>
    );

    const messagesView = (
        <ChatMessages
            messages={messages}
            isLoading={isLoading}
            phase={streamPhase}
            cards={project.cards}
            onFollowUpClick={setInput}
        />
    );

    const inputArea = (
        <div className={`flex flex-col ${isFullscreen ? 'bg-[var(--neutral-200)] rounded-2xl shadow-sm border border-[var(--neutral-300)]' : 'bg-[var(--neutral-100)] rounded-xl shadow-sm border border-[var(--neutral-300)]'} focus-within:border-[var(--accent-400)] transition-all overflow-hidden`}>
            {/* Attachments */}
            {attachments && attachments.length > 0 && (
                <AttachmentsList
                    attachments={attachments}
                    setAttachments={setAttachments}
                    variant={variant}
                />
            )}

            <div className={`flex items-end ${isFullscreen ? 'p-2 gap-2' : 'p-1.5 gap-1'}`}>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`${isFullscreen ? 'p-2 hover:bg-[var(--neutral-300)] rounded-xl mb-1' : 'p-1.5 hover:bg-[var(--neutral-200)] rounded-lg mb-0.5'} text-[var(--neutral-500)] hover:text-[var(--accent-500)] transition-all`}
                    aria-label="Upload file"
                    title="Upload file"
                >
                    <MdFileUpload size={isFullscreen ? 22 : 18} />
                </button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={isFullscreen ? 'Message assistant...' : 'Ask anything...'}
                    className={`flex-1 bg-transparent outline-none text-[var(--foreground)] resize-none ${isFullscreen ? 'py-3 px-2 max-h-[40vh] min-h-[44px]' : 'py-1.5 px-1 text-sm max-h-40 overflow-y-auto'}`}
                    rows={1}
                />

                <button
                    onClick={onSend}
                    disabled={isLoading || !input.trim()}
                    className={`${isFullscreen ? 'p-2.5 rounded-xl mb-1' : 'p-1.5 rounded-lg mb-0.5'} transition-all ${
                        !isLoading && input.trim()
                        ? `bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] ${isFullscreen ? 'shadow-md' : 'shadow-sm'}`
                        : 'text-[var(--neutral-400)] cursor-not-allowed'
                    }`}
                    aria-label="Send message"
                    title="Send message"
                >
                    {isLoading ? (
                        <FiCircle className="animate-spin" size={sz.iconSm} />
                    ) : (
                        <FiSend size={sz.iconSm} />
                    )}
                </button>
            </div>
        </div>
    );

    const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputElement = e.target;
        try {
            const file = inputElement.files?.[0];
            if (file) {
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

                await validateAndUploadFiles([file], {
                    projectId: project.id,
                    onError: (message) => setModalContents({
                        isOpen: true, type: "error", width: "sm", message, onClose: () => setModalContents(noModal),
                    }),
                    onFileError: (_, message) => setModalContents({
                        isOpen: true, type: "error", width: "sm", message, onClose: () => setModalContents(noModal),
                    }),
                    onSuccess: addFileAttachment,
                });
            }
        } finally {
            // Reset input value to allow re-uploading the same file
            if (inputElement) {
                inputElement.value = "";
            }
        }
    };

    return (
        <div className={`transition-all duration-300 ${isFullscreen ? 'absolute inset-0 z-50 bg-[var(--neutral-100)]' : ''}`}>
            {chatToggled ? (
                isFullscreen ? (
                    <div className="flex flex-col h-full w-full">
                        {/* Modern Fullscreen Header */}
                        <div className="flex justify-between items-center px-8 py-4 border-b border-transparent bg-transparent relative">
                            <div className="flex items-center gap-4">
                                <h2 className="text-[var(--foreground)] text-xl font-bold opacity-80">{project.title}</h2>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowPreferences(!showPreferences)}
                                    className={`${sz.btnPad} ${sz.btnRound} transition-colors ${sz.hoverBg} ${showPreferences ? `text-[var(--accent-500)] ${sz.activeBg}` : 'text-[var(--neutral-500)]'}`}
                                    aria-label="Chat settings"
                                    title="Chat settings"
                                >
                                    <FiSettings size={sz.icon} />
                                </button>
                                <button
                                    onClick={() => setIsFullscreen(false)}
                                    className={`${sz.btnPad} ${sz.btnRound} transition-colors ${sz.hoverBg} text-[var(--neutral-500)]`}
                                    aria-label="Exit fullscreen"
                                    title="Exit fullscreen"
                                >
                                    <FiMinimize size={sz.icon} />
                                </button>
                                {preferencesPopup}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div ref={messagesEndRef} className="flex-1 overflow-y-auto pt-4 pb-2">
                            <div className="max-w-5xl mx-auto px-8">
                                {messagesView}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="pb-6 pt-2">
                            <div className="max-w-5xl mx-auto px-8">
                                {inputArea}
                                <p className="text-[10px] text-center mt-2 text-[var(--neutral-500)]">
                                    Assistant can make mistakes. Check important info.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[var(--neutral-200)] rounded-xl p-2 flex flex-col h-[100%] w-[45vw] shadow-sm border border-[var(--neutral-300)]">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2 relative px-2 py-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-[var(--foreground)] text-base font-bold opacity-90 tracking-tight">Chat</h2>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowPreferences(!showPreferences)}
                                    className={`${sz.btnPad} ${sz.btnRound} transition-colors ${sz.hoverBg} ${showPreferences ? `text-[var(--accent-500)] ${sz.activeBg}` : 'text-[var(--neutral-500)]'}`}
                                    aria-label="Open chat preferences"
                                    title="Open chat preferences"
                                >
                                    <FiSettings size={sz.icon} />
                                </button>
                                <button
                                    onClick={() => setIsFullscreen(true)}
                                    className={`${sz.btnPad} ${sz.btnRound} transition-colors ${sz.hoverBg} text-[var(--neutral-500)]`}
                                    aria-label="Enter fullscreen mode"
                                    title="Enter fullscreen mode"
                                >
                                    <FiMaximize size={sz.icon} />
                                </button>
                                <button
                                    onClick={() => setChatToggled(false)}
                                    className={`${sz.btnPad} ${sz.btnRound} transition-colors ${sz.hoverBg} text-[var(--neutral-500)]`}
                                    aria-label="Close chat"
                                    title="Close chat"
                                >
                                    <FiX size={18} />
                                </button>
                                {preferencesPopup}
                            </div>
                        </div>

                        {/* Message container */}
                        <div ref={messagesEndRef} className="flex-1 overflow-y-auto bg-[var(--neutral-100)] rounded-xl p-2 mb-2 flex flex-col min-h-0 border border-[var(--neutral-300)]/50">
                            <div className="px-1">
                                {messagesView}
                            </div>
                        </div>

                        {/* Input Area */}
                        {inputArea}
                    </div>
                )
            ) : (
                <div className="absolute top-12 right-2 m-4">
                    <BsFillChatRightTextFill
                        className="text-[var(--accent-400)] text-xl cursor-pointer"
                        onClick={() => {setChatToggled(true)}}
                        aria-label="Open chat"
                        title="Open chat"
                    />
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                accept={ALLOWED_MIME_TYPES.map(type => type.endsWith('/') ? type + '*' : type).join(',')}
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
            />
        </div>
    );
};

export default ChatPanel;
