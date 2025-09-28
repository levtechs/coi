import React from "react"

import { FiLoader } from "react-icons/fi";

import { Message, StreamPhase, ChatAttachment } from "@/lib/types";

import MarkdownArticle from "../../md";

interface ChatMessagesProps {
    messages: Message[];
    stream: string | null;
    isLoading: boolean;
    phase: null | StreamPhase;
}

const ChatMessages = ({ messages, stream, isLoading, phase}: ChatMessagesProps) => {
    
    const phaseMessages: Record<string, string> = {
        starting: "Starting...",
        searching: "Searching...",
        streaming: "Explaining...",
        processing: "Thinking...",
        "generating content": "Making notes...",
        "generating cards": "Making cards...",
    };

    return (
        <>
            {messages.length === 0 ? (
                <p className="text-[var(--neutral-500)] text-sm">No messages yet</p>
            ) : (
                messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))
            )}
            {/* Partial / stream message */}
            {stream && (
                 <ChatMessage stream={stream} />
            )}
            {/* Loading / thinking message */}
            {isLoading && (
                <div className="self-start bg-[var(--neutral-300)] text-[var(--foreground)] p-2 rounded-md mb-2 max-w-[70%] flex items-center space-x-2">
                    <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />
                    <span>{phase ? phaseMessages[phase] : "Thinking..."}</span>
                </div>
            )}
        </>
    );
}

export default React.memo(ChatMessages);

interface ChatMessageParams {
    message?: Message;
    stream?: string
}

const ChatMessage = ({ message, stream }: ChatMessageParams) => {
    return (
        <div className="flex flex-col">
            {/* Attachments of user-sent message*/}
            {message && message.attachments && (
                <div className={`flex items-center gap-2 overflow-auto py-1 ${message.isResponse ? "ml-4 p-2 justify-start" : "justify-end"}`}>
                     {message.attachments.map((attachment: ChatAttachment) => {
                         // Determine display text based on type
                         let text: string | undefined;
                         let url: string | undefined;
                         if ("web" in attachment && attachment.web) {
                             text = attachment.web.title;
                             url = attachment.web.uri;
                         } else if ("title" in attachment) {
                             text = attachment.title;
                         } else if ("text" in attachment) {
                             text = attachment.text;
                         }

                         if (!text) return null;

                        return (
                            <div
                                key={"id" in attachment ? attachment.id : crypto.randomUUID()}
                                className={`flex items-center justify-between w-32 h-8 bg-[var(--neutral-300)] rounded flex-shrink-0 ${url ? 'cursor-pointer hover:bg-[var(--neutral-400)]' : ''}`}
                                onClick={url ? () => window.open(url, '_blank') : undefined}
                            >
                                <p className="truncate ml-2 text-sm">{text}</p>
                            </div>
                        );
                     })}
                </div>
            )}
            <div
                className={`p-2 mb-4 rounded-md break-words prose prose-sm
                    ${message && message.isResponse || stream
                        ? "self-start max-w-[100%] text-[var(--foreground)]"
                        : "self-end max-w-[70%] bg-[var(--accent-400)] text-[var(--foreground)]"
                    }`}
            >
                {message && message.isResponse || stream ? (
                    <div className="p-4">
                        <MarkdownArticle markdown={message?.content ?? stream ?? ""} />
                    </div>
                ) : (message?.content)}
            </div>
        </div>
    )
}
