import { Dispatch, SetStateAction } from "react";
import { Message, Project, Card, StreamPhase, ChatAttachment, ChatPreferences } from "@/lib/types";
import { streamChat } from "@/app/views/chat";
import { streamQuickCreate } from "@/app/views/quickCreate";

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

/**
 * Sends a quick-create message that creates a new project and streams the first response.
 * Mirrors sendMessage but uses streamQuickCreate and calls onProjectCreated when done.
 */
export const sendQuickCreateMessage = async (
    input: string,
    attachments: null | ChatAttachment[],
    project: Project,
    preferences: ChatPreferences,
    addMessage: (msg: Message) => void,
    setNewCards: (newCards: Card[]) => void,
    updatePhase: Dispatch<SetStateAction<null | StreamPhase>>,
    setLoading: Dispatch<SetStateAction<boolean>>,
    setMessages: Dispatch<SetStateAction<Message[]>>,
    onProjectCreated: (projectId: string) => void,
) => {
    if (!input.trim()) return;

    const userInput = input.trim();
    const userMessage: Message = { content: userInput, attachments: attachments, isResponse: false, id: crypto.randomUUID() };
    addMessage(userMessage);

    try {
        setLoading(true);

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
        };

        const result = await streamQuickCreate(
            userInput,
            attachments,
            preferences,
            setPhase,
            (finalMessage: Message) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === streamingMessageId
                        ? { ...finalMessage, id: streamingMessageId }
                        : msg
                ));
            },
            (newCards: Card[]) => {
                setNewCards(newCards);
            },
            (questions: string[]) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === streamingMessageId
                        ? { ...msg, followUpQuestions: questions }
                        : msg
                ));
            },
            (token) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === streamingMessageId
                        ? { ...msg, content: msg.content + token }
                        : msg
                ));
            },
            (projectId: string) => {
                console.log("Quick create project ID received:", projectId);
            },
        );

        setPhase(null);
        setLoading(false);

        // Navigate to the real project
        if (result.projectId) {
            onProjectCreated(result.projectId);
        }
    } catch (err) {
        console.error("Error in quick create:", err);
        addMessage({ content: "I couldn't create the project. Please try again later.", isResponse: true, id: crypto.randomUUID() } as Message);
        setLoading(false);
    }
};
