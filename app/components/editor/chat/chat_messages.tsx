import React, { useState } from "react"

import { Message, StreamPhase, ChatAttachment, Card } from "@/lib/types";
import { useSmoothStream } from "@/app/hooks/use-smooth-stream";
import { getAttachmentIcon } from "./attachments_list";

import MarkdownArticle from "../../md";
import CardPopup from "../cards/card_popup";

interface ChatMessagesProps {
    messages: Message[];
    isLoading: boolean;
    phase: null | StreamPhase;
    cards?: Card[];
    onFollowUpClick?: (question: string) => void;
    onSourcesClick?: (attachment: ChatAttachment) => void;
}

const ChatMessages = ({ messages, isLoading, phase, cards, onFollowUpClick, onSourcesClick }: ChatMessagesProps) => {
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);

    const phaseMessages: Record<string, string> = {
        starting: "Starting...",
        searching: "Searching...",
        streaming: "Explaining...",
        processing: "Thinking...",
    };

    const content = (
        <>
            {messages.length === 0 ? (
                <p className="text-[var(--neutral-500)] text-sm">No messages yet</p>
            ) : (
                  messages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} cards={cards} onCardClick={setSelectedCard} onFollowUpClick={onFollowUpClick} onSourcesClick={onSourcesClick} />
                  ))
            )}

            {/* Loading / thinking message */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-10 w-full animate-in fade-in duration-1000">
                    <div className="flex flex-col items-center gap-4">
                        {/* Modern bouncing dots */}
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--accent-500)] animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 rounded-full bg-[var(--accent-500)] animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 rounded-full bg-[var(--accent-500)] animate-bounce"></span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-[11px] font-bold text-[var(--neutral-400)] uppercase tracking-[0.4em] pl-[0.4em] animate-pulse">
                                {phase ? phaseMessages[phase] : "Assistant is thinking"}
                            </span>
                            {/* Subtle pulsing separator */}
                            <div className="h-px w-32 bg-gradient-to-r from-transparent via-[var(--neutral-300)] to-transparent animate-pulse"></div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <>
            {content}
            {selectedCard && (
                <CardPopup 
                    card={selectedCard} 
                    onClose={() => setSelectedCard(null)} 
                />
            )}
        </>
    );
}

export default React.memo(ChatMessages);

interface ChatMessageParams {
    message: Message;
    cards?: Card[];
    onCardClick?: (card: Card) => void;
    onFollowUpClick?: (question: string) => void;
    onSourcesClick?: (attachment: ChatAttachment) => void;
}

const ChatMessage = ({ message, cards, onCardClick, onFollowUpClick, onSourcesClick }: ChatMessageParams) => {
    const smoothContent = useSmoothStream(message.content, message.isResponse);

    return (
        <div className="flex flex-col mb-4">
            {/* Attachments of user-sent message*/}
            {message.attachments && (
                <div className={`flex items-center gap-2 overflow-auto mb-2 ${message.isResponse ? "ml-4 justify-start" : "justify-end"}`}>
                     {message.attachments
                         .sort((a, b) => {
                             const isThinkA = 'time' in a;
                             const isThinkB = 'time' in b;
                             if (isThinkA && !isThinkB) return -1;
                             if (!isThinkA && isThinkB) return 1;
                             return 0;
                          })
                         .map((attachment: ChatAttachment) => {
                          const liveCard = ('id' in attachment && 'details' in attachment)
                              ? cards?.find((card) => card.id === attachment.id)
                              : undefined;
                          const displayAttachment: ChatAttachment = liveCard || attachment;

                          // Determine display text based on type
                          let text: string | undefined;
                          let url: string | undefined;
                            if ("type" in displayAttachment && displayAttachment.type === "sources") {
                                text = `${displayAttachment.chunks.length} Source${displayAttachment.chunks.length === 1 ? '' : 's'}`;
                            } else if ("web" in displayAttachment && displayAttachment.web) {
                                text = displayAttachment.web.title;
                                url = displayAttachment.web.uri;
                            } else if ("summary" in displayAttachment) {
                               // For thinking attachments, show title
                               text = displayAttachment.title;
                           } else if ("title" in displayAttachment) {
                               text = displayAttachment.title;
                           } else if ("name" in displayAttachment) {
                               text = displayAttachment.name;
                           } else if ("text" in displayAttachment) {
                               text = displayAttachment.text;
                           }

                           if (!text) return null;

                            const isCard = 'title' in displayAttachment && 'details' in displayAttachment && onCardClick;
                            const isSources = 'type' in displayAttachment && displayAttachment.type === 'sources';
                            const isClickable = isCard || isSources || url;

                           return (
                               <div
                                  key={"id" in displayAttachment ? displayAttachment.id : crypto.randomUUID()}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors shrink-0
                                      ${isClickable 
                                          ? "cursor-pointer bg-[var(--neutral-200)] text-[var(--neutral-700)] border border-[var(--neutral-300)] hover:bg-[var(--accent-100)] hover:text-[var(--accent-700)] hover:border-[var(--accent-300)]" 
                                          : "bg-[var(--neutral-200)] text-[var(--neutral-600)] border border-[var(--neutral-300)]"
                                      }`}
                                  onClick={isCard ? () => onCardClick(displayAttachment as Card) : (isSources ? () => onSourcesClick?.(displayAttachment) : (url ? () => window.open(url, '_blank') : undefined))}
                                  title={'summary' in displayAttachment ? displayAttachment.summary : undefined}
                              >
                                  <span className="shrink-0 text-[var(--neutral-500)]">
                                      {getAttachmentIcon(displayAttachment)}
                                  </span>
                                  <span className="max-w-[150px] truncate">{text}</span>
                              </div>
                          );
                     })}

                </div>
            )}

            {/* Main message content */}
            <div
                className={`px-4 py-3 rounded-md break-words prose prose-sm
                    ${message.isResponse
                        ? "self-start max-w-[100%] text-[var(--foreground)]"
                        : "self-end max-w-[70%] bg-[var(--accent-400)] text-[var(--foreground)]"
                    }`}
            >
                {message.isResponse ? (
                    <MarkdownArticle markdown={smoothContent} cards={cards} onCardClick={onCardClick} />
                ) : (message.content)}
            </div>

            {/* Follow-up Questions - indented to align with message content */}
            {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                <div className="self-start max-w-[100%] mt-3">
                    <div className="bg-[var(--neutral-100)] rounded-md px-4 py-3 ml-4">
                        <p className="text-sm text-[var(--neutral-600)] mb-3 font-medium">Suggested follow-ups:</p>
                        <div className="flex flex-col gap-2">
                            {message.followUpQuestions.map((question: string, index: number) => (
                                <button
                                    key={index}
                                    onClick={() => onFollowUpClick?.(question)}
                                    className="bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] text-[var(--foreground)] border border-[var(--neutral-300)] px-3 py-2 rounded-md text-sm transition-colors cursor-pointer text-left"
                                >
                                    <MarkdownArticle markdown={question} singleLine={true} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
