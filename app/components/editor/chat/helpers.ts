import { Dispatch, SetStateAction } from "react";
import { Message, Project } from "@/lib/types";
import { streamChat } from "@/app/views/chat";

export const sendMessage = async (
    input: string,
    messages: Message[],
    project: Project,
    addMessage: (msg: Message) => void, 
    setStream: Dispatch<SetStateAction<string | null>>,
    updatePhase: Dispatch<SetStateAction<null | "streaming" | "processing" | "generating content" | "generating cards">>,
    setProject: (updater: (prev: Project | null) => Project | null) => void,
    setInput: Dispatch<SetStateAction<string>>,
    setLoading: Dispatch<SetStateAction<boolean>>
) => {
    if (!input.trim()) return;

    const userInput = input.trim();
    const userMessage: Message = { content: userInput, isResponse: false, id: crypto.randomUUID() };
    addMessage(userMessage)
    setInput("");

    try {
        setLoading(true);
        const MAX_HISTORY = 10;
        const recentMessages = [...messages, userMessage].slice(-MAX_HISTORY);

        let streamedContent = "";
        setStream(streamedContent);

        const setPhase = (phase: null | "streaming" | "processing" | "generating content" | "generating cards") => {
            if (phase == "processing") {
                setStream(null);
            }

            updatePhase(phase);
        }

        const finalData = await streamChat(
            userInput, 
            recentMessages, 
            project.id, 
            setPhase, 
            (finalMessage: string) => addMessage({ content: finalMessage, isResponse: true, id: crypto.randomUUID()}),
            (token) => {
                streamedContent += token;
                setStream(streamedContent);
            }
         );

        setPhase(null);

        // Apply final result (new content/cards)
        setProject(prev => {
            if (!prev) return null;
            return {
                ...prev,
                content: JSON.parse(JSON.stringify(finalData.newContent)) ?? prev.content,
                cards: finalData.allCards ?? prev.cards,
            };
        });

        setLoading(false);
    } catch (err) {
        console.error("Error streaming chat:", err);
        addMessage({ content: "I couldn't generate a response. Please try again later.", isResponse: true, id: crypto.randomUUID() } as Message)
        setLoading(false);
    }
};
