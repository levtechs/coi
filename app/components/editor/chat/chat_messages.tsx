import React, { useState } from "react"

import { Message, StreamPhase, ChatAttachment, Card } from "@/lib/types";
import { useSmoothStream } from "@/app/hooks/use-smooth-stream";

import MarkdownArticle from "../../md";
import CardPopup from "../cards/card_popup";

interface ChatMessagesProps {
    messages: Message[];
    isLoading: boolean;
    phase: null | StreamPhase;
    cards?: Card[];
    onFollowUpClick?: (question: string) => void;
}

const ChatMessages = ({ messages, isLoading, phase, cards, onFollowUpClick }: ChatMessagesProps) => {
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);

    const phaseMessages: Record<string, string> = {
        starting: "Starting...",
        searching: "Searching...",
        streaming: "Explaining...",
        processing: "Thinking...",
        "generating content": "Making notes...",
        "generating cards": "Making cards...",
    };

    const content = (
        <>
            {messages.length === 0 ? (
                <p className="text-[var(--neutral-500)] text-sm">No messages yet</p>
            ) : (
                  messages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} cards={cards} onCardClick={setSelectedCard} onFollowUpClick={onFollowUpClick} />
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
}

const ChatMessage = ({ message, cards, onCardClick, onFollowUpClick }: ChatMessageParams) => {
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
                         // Determine display text based on type
                         let text: string | undefined;
                         let url: string | undefined;
                          if ("web" in attachment && attachment.web) {
                              text = attachment.web.title;
                              url = attachment.web.uri;
                          } else if ("summary" in attachment) {
                              // For thinking attachments, show title
                              text = attachment.title;
                          } else if ("title" in attachment) {
                              text = attachment.title;
                          } else if ("name" in attachment) {
                              text = attachment.name;
                          } else if ("text" in attachment) {
                              text = attachment.text;
                          }

                         if (!text) return null;

                          // Handle card attachments
                          if ('title' in attachment && 'details' in attachment && onCardClick) {
                              return (
                                  <div
                                      key={attachment.id}
                                      className="flex items-center justify-between w-32 h-8 bg-[var(--neutral-300)] rounded flex-shrink-0 cursor-pointer hover:bg-[var(--neutral-400)] transition-colors"
                                      onClick={() => onCardClick(attachment as Card)}
                                      title={attachment.title}
                                  >
                                      <p className="text-sm ml-2 truncate">{text}</p>
                                  </div>
                              );
                          }

                          return (
                              <div
                                  key={"id" in attachment ? attachment.id : crypto.randomUUID()}
                                  className={`flex items-center justify-between ${'time' in attachment ? 'px-3 w-auto min-w-32 max-w-full' : 'w-32'} h-8 bg-[var(--neutral-300)] rounded flex-shrink-0 ${url ? 'cursor-pointer hover:bg-[var(--neutral-400)]' : ''}`}
                                  onClick={url ? () => window.open(url, '_blank') : undefined}
                                  title={'summary' in attachment ? attachment.summary : undefined}
                              >
                                  <p className={`text-sm ${'time' in attachment ? '' : 'ml-2 truncate'}`}>{text}</p>
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
