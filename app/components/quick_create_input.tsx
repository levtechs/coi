"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { ChatPreferences, ChatAttachment, FileAttachment } from "@/lib/types";
import { getUserPreferences } from "@/app/views/chat";
import { uploadFileToStorageOnly } from "@/app/views/uploads";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/uploadConstants";

import { FiArrowRight, FiLoader, FiX } from "react-icons/fi";
import { MdFileUpload } from "react-icons/md";

const PLACEHOLDER_MESSAGES = [
    "Ask anything...",
    "What would you like to learn about today?",
    "What are you curious about?",
    "Type a question to get started...",
    "Ask about any topic...",
];

const TYPING_SPEED = 50;
const DELETING_SPEED = 30;
const PAUSE_DURATION = 2000;

const DEFAULT_PREFERENCES: ChatPreferences = {
    model: "normal",
    thinking: "auto",
    googleSearch: "auto",
    forceCardCreation: "auto",
    personality: "default",
    followUpQuestions: "auto",
    generationModel: "flash",
};

interface QuickCreateInputProps {
    chatPreferences?: ChatPreferences | null;
    isLoggedIn?: boolean;
    className?: string;
    /** If true, will auto-redirect to /projects/new when a pending query is found after login */
    autoRedirectOnPending?: boolean;
}

const QuickCreateInput = ({ 
    chatPreferences = null, 
    isLoggedIn = true,
    className = "",
    autoRedirectOnPending = false
}: QuickCreateInputProps) => {
    const router = useRouter();
    const [input, setInput] = useState("");
    const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const hasProcessedPending = useRef(false);

    // Typing effect state
    const [placeholderText, setPlaceholderText] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    const [messageIndex, setMessageIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Restore pending query on mount (if user was redirected to login)
    // Note: For landing page → login → /projects/new flow, the quickCreateData is already set
    // This is mainly for the dashboard case where user refreshes or navigates back
    useEffect(() => {
        if (hasProcessedPending.current) return;
        
        // Check if there's already quickCreateData (from landing page flow)
        const existingData = sessionStorage.getItem("quickCreateData");
        if (existingData && isLoggedIn && autoRedirectOnPending) {
            hasProcessedPending.current = true;
            // Already have data, just need to redirect to /projects/new
            router.push("/projects/new");
            return;
        }
        
        // Handle the case where user typed something before login but didn't submit
        const pendingQuery = sessionStorage.getItem("pendingQuickQuery");
        if (pendingQuery) {
            hasProcessedPending.current = true;
            
            if (isLoggedIn && autoRedirectOnPending) {
                // User just logged in and we have a pending query - redirect to create project
                sessionStorage.removeItem("pendingQuickQuery");
                
                const quickCreateData = {
                    message: pendingQuery,
                    attachments: null,
                    preferences: chatPreferences || DEFAULT_PREFERENCES,
                };
                sessionStorage.setItem("quickCreateData", JSON.stringify(quickCreateData));
                router.push("/projects/new");
            } else if (!isLoggedIn) {
                // Not logged in yet, just restore the input
                setInput(pendingQuery);
                sessionStorage.removeItem("pendingQuickQuery");
            }
        }
    }, [isLoggedIn, autoRedirectOnPending, chatPreferences, router]);

    const animatePlaceholder = useCallback(() => {
        const currentMessage = PLACEHOLDER_MESSAGES[messageIndex];

        if (isTyping) {
            if (charIndex < currentMessage.length) {
                setPlaceholderText(currentMessage.slice(0, charIndex + 1));
                setCharIndex(charIndex + 1);
            } else {
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), PAUSE_DURATION);
            }
        } else {
            if (charIndex > 0) {
                setPlaceholderText(currentMessage.slice(0, charIndex - 1));
                setCharIndex(charIndex - 1);
            } else {
                setMessageIndex((messageIndex + 1) % PLACEHOLDER_MESSAGES.length);
                setIsTyping(true);
            }
        }
    }, [charIndex, isTyping, messageIndex]);

    useEffect(() => {
        // Clear any existing timeout when effect runs to ensure only one is active
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(
            animatePlaceholder,
            isTyping ? TYPING_SPEED : DELETING_SPEED
        );
        
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [animatePlaceholder, isTyping, charIndex]); // Added charIndex dependency to re-trigger on update

    const handleSubmit = async () => {
        if (!input.trim() || isSubmitting) return;
        setIsSubmitting(true);

        try {
            // If not logged in, store query and redirect to login
            if (!isLoggedIn) {
                // Store the full quick create data so we can go directly to /projects/new after login
                const quickCreateData = {
                    message: input.trim(),
                    attachments: null, // Anonymous users can't upload files
                    preferences: DEFAULT_PREFERENCES,
                };
                sessionStorage.setItem("quickCreateData", JSON.stringify(quickCreateData));
                router.push("/login?signup=true&forward=/projects/new");
                return;
            }

            // Resolve preferences
            let preferences = chatPreferences || DEFAULT_PREFERENCES;
            if (!chatPreferences) {
                try {
                    const fetched = await getUserPreferences();
                    if (fetched) preferences = fetched;
                } catch {
                    // Use defaults
                }
            }

            const quickCreateData = {
                message: input.trim(),
                attachments: attachments.length > 0 ? attachments : null,
                preferences,
            };
            sessionStorage.setItem("quickCreateData", JSON.stringify(quickCreateData));

            router.push("/projects/new");
        } catch (err) {
            console.error("Failed to initiate quick create:", err);
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!ALLOWED_MIME_TYPES.some(type => file.type.startsWith(type))) {
            alert(`File type ${file.type} not allowed. Only images and documents are permitted.`);
            return;
        }

        const currentSize = attachments.reduce((sum, att) => {
            if ('type' in att && att.type === 'file') {
                return sum + (att as FileAttachment).size;
            }
            return sum;
        }, 0);
        if (currentSize + file.size > MAX_UPLOAD_SIZE_BYTES) {
            alert(`Total attachment size would exceed ${MAX_UPLOAD_SIZE_MB}MB. Please remove some attachments.`);
            return;
        }

        try {
            const attachment = await uploadFileToStorageOnly(file);
            setAttachments(prev => [attachment, ...prev]);
        } catch (error) {
            console.error("Upload failed:", error);
            alert(error instanceof Error ? error.message : "Upload failed.");
        }
    };

    return (
        <div className={`flex flex-col items-center justify-center w-full max-w-2xl mx-auto mb-8 mt-6 ${className}`}>
            {/* Attachments Display - only when logged in */}
            {isLoggedIn && attachments.length > 0 && (
                <div className="w-full mb-3 flex flex-wrap gap-2">
                    {attachments.map((attachment: ChatAttachment, index: number) => {
                        let text: string;
                        let id: string;
                        
                        if ("type" in attachment && attachment.type === 'file') {
                            text = attachment.name;
                            id = attachment.id || `file-${attachment.name}-${index}`;
                        } else if ("title" in attachment) {
                            text = attachment.title;
                            id = attachment.title || `card-${index}`;
                        } else if ("text" in attachment) {
                            text = attachment.text;
                            id = `text-${attachment.text.substring(0, 10)}-${index}`;
                        } else {
                            text = "attachment";
                            id = `unknown-${index}`;
                        }

                        return (
                            <div
                                key={id}
                                className="flex items-center justify-between px-3 py-1 bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded-full text-sm"
                            >
                                <span className="truncate max-w-[150px]">{text}</span>
                                <FiX
                                    className="ml-2 cursor-pointer text-[var(--neutral-500)] hover:text-[var(--foreground)]"
                                    onClick={() => setAttachments(prev => prev.filter(att => att !== attachment))}
                                />
                            </div>
                        );
                    })}
                </div>
            )}


            {/* Input Container with Glow Effect */}
            <div className="relative w-full group">
                {/* Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--accent-500)] to-[var(--accent-300)] rounded-2xl opacity-30 group-hover:opacity-60 transition duration-500 blur-sm group-focus-within:opacity-100"></div>
                
                <div className="relative flex items-center w-full bg-[var(--neutral-100)] rounded-xl border border-[var(--neutral-300)] focus-within:border-[var(--accent-500)] transition-all duration-200 shadow-sm">
                    {/* File Upload Button - disabled when not logged in */}
                    <button 
                        className={`
                            pl-4 pr-2 py-4 transition-colors
                            ${isLoggedIn 
                                ? "text-[var(--neutral-500)] hover:text-[var(--accent-500)]" 
                                : "text-[var(--neutral-400)] cursor-not-allowed"}
                        `}
                        onClick={() => isLoggedIn && fileInputRef.current?.click()}
                        title={isLoggedIn ? "Add attachment" : "Sign in to upload files"}
                        disabled={!isLoggedIn}
                    >
                        <MdFileUpload size={24} />
                    </button>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholderText}
                        disabled={isSubmitting}
                        autoFocus
                        className="flex-1 py-4 bg-transparent border-none outline-none text-lg text-[var(--foreground)] placeholder:text-[var(--neutral-400)] min-w-0"
                    />

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !input.trim()}
                        className={`
                            mx-2 p-2 rounded-lg transition-all duration-200
                            ${input.trim() && !isSubmitting 
                                ? "bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] shadow-md" 
                                : "bg-[var(--neutral-200)] text-[var(--neutral-400)] cursor-not-allowed"}
                        `}
                    >
                        {isSubmitting ? (
                            <FiLoader className="animate-spin" size={20} />
                        ) : (
                            <FiArrowRight size={20} />
                        )}
                    </button>
                </div>
            </div>

            {/* Hidden File Input - only functional when logged in */}
            <input
                type="file"
                ref={fileInputRef}
                accept={ALLOWED_MIME_TYPES.map(type => type.endsWith('/') ? type + '*' : type).join(',')}
                style={{ display: 'none' }}
                disabled={!isLoggedIn}
                onChange={async (e) => {
                    if (!isLoggedIn) return;
                    const file = e.target.files?.[0];
                    if (file) {
                        await handleFileUpload(file);
                    }
                    e.target.value = "";
                }}
            />
        </div>
    );
};

export default QuickCreateInput;
