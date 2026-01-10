import { Dispatch, SetStateAction } from "react";
import { Message, Project, Card, StreamPhase, ChatAttachment, ChatPreferences } from "@/lib/types";
import { streamChat } from "@/app/views/chat";

export const sendMessage = async (
    input: string,
    messages: Message[],
    attatchments: null | ChatAttachment[],
    project: Project,
    preferences: ChatPreferences,
    addMessage: (msg: Message) => void,
    setNewCards: (newCards: Card[]) => void,
    updatePhase: Dispatch<SetStateAction<null | StreamPhase>>,
    setInput: Dispatch<SetStateAction<string>>,
    setLoading: Dispatch<SetStateAction<boolean>>,
    setMessages: Dispatch<SetStateAction<Message[]>>
) => {
    if (!input.trim()) return;

    const userInput = input.trim();
    const userMessage: Message = { content: userInput, attachments: attatchments, isResponse: false, id: crypto.randomUUID() };
    addMessage(userMessage)
    setInput("");

    try {
        setLoading(true);
        const MAX_HISTORY = 10;
        const recentMessages = [...messages, userMessage].slice(-MAX_HISTORY);

        // Add a streaming message placeholder
        const streamingMessageId = crypto.randomUUID();
        const streamingMessage: Message = {
            id: streamingMessageId,
            content: "",
            isResponse: true,
            attachments: []
        };
        addMessage(streamingMessage);

        const setPhase = (phase: null | StreamPhase) => {
            updatePhase(phase);
        }

          await streamChat(
             userInput,
             recentMessages,
             attatchments,
             project.id,
             preferences,
             setPhase,
             (finalMessage: Message) => {
                 // Replace the streaming message with the final message
                 setMessages(prev => prev.map(msg =>
                     msg.id === streamingMessageId
                         ? {...finalMessage, id: streamingMessageId}
                         : msg
                 ));
             },
               (newCards: Card[]) => {
                   setNewCards(newCards);
               },
             (questions: string[]) => {
                 // Update the streaming message with follow-up questions
                 setMessages(prev => prev.map(msg =>
                     msg.id === streamingMessageId
                         ? {...msg, followUpQuestions: questions}
                         : msg
                 ));
             },
             (token) => {
                 // Update the streaming message content
                 setMessages(prev => prev.map(msg =>
                     msg.id === streamingMessageId
                         ? {...msg, content: msg.content + token}
                         : msg
                 ));
             },
          );

          setPhase(null);
          setLoading(false);
    } catch (err) {
        console.error("Error streaming chat:", err);
        addMessage({ content: "I couldn't generate a response. Please try again later.", isResponse: true, id: crypto.randomUUID() } as Message)
        setLoading(false);
    }
};
