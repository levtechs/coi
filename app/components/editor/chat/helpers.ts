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
    setStream: Dispatch<SetStateAction<string | null>>,
    setNewCards: (newCards: Card[]) => void,
    updatePhase: Dispatch<SetStateAction<null | StreamPhase>>,
    setInput: Dispatch<SetStateAction<string>>,
    setLoading: Dispatch<SetStateAction<boolean>>
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

        let streamedContent = "";
        setStream(streamedContent);

        const setPhase = (phase: null | StreamPhase) => {
            if (phase == "processing") {
                setStream(null);
            }

            updatePhase(phase);
        }

        const result = await streamChat(
            userInput,
            recentMessages,
            attatchments,
            project.id,
            preferences,
            setPhase,
            (finalMessage: Message) => addMessage({...finalMessage, id: crypto.randomUUID()}),
            (newCards: Card[]) => setNewCards(newCards),
            (token) => {
                streamedContent += token;
                setStream(streamedContent);
            },
         );

        // Cards are updated via Firestore listener

        setPhase(null);

        setLoading(false);
    } catch (err) {
        console.error("Error streaming chat:", err);
        addMessage({ content: "I couldn't generate a response. Please try again later.", isResponse: true, id: crypto.randomUUID() } as Message)
        setLoading(false);
    }
};
