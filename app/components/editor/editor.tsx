"use client";

import { useState } from "react";
import { Project, Card, ChatAttachment, CardFilter } from "@/lib/types";
import Modal from "../modal";
import MenuBar from "./menu/menu";
import ContentPanel from "./content";
import ChatPanel from "./chat/chat";
import { noModal } from "./types";
import TabSelector from "./tab_selector";
import CardsPanel from "./cards/cards_panel";
import CardPopup from "./cards/card_popup";

interface EditorProps {
    project: Project;
    user: { uid: string } | null;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setTitle: (projectId: string, newTitle: string) => Promise<void>;
}

const Editor = ({
    project,
    user,
    addCollaborator,
    setTitle,
}: EditorProps) => {
    const [tab, setTab] = useState<"content" | "cards">("content"); // "content" or "cards"

    const [cardFilters, setCardFilters] = useState<CardFilter>("11");
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    const knowledgeShown = cardFilters[0] === '1';
    const resourceShown = cardFilters[1] === '1';

    const toggleKnowledge = () => {
        const newKnowledge = knowledgeShown ? '0' : '1';
        setCardFilters((newKnowledge + cardFilters[1]) as CardFilter);
    };

    const toggleResource = () => {
        const newResource = resourceShown ? '0' : '1';
        setCardFilters((cardFilters[0] + newResource) as CardFilter);
    };

    const [modalContents, setModalContents] = useState(noModal);
    const closeModal = () => setModalContents(noModal);

    const [chatAttachments, setChatAttachments] = useState<null | ChatAttachment[]>(null);
    const [cardPopup, setCardPopup] = useState<Card | null>(null);


    return (
        <div className="flex flex-col h-dvh w-full bg-[var(--neutral-100)] text-[var(--foreground)]">
            {/* Main Layout Container */}
            <div className="flex flex-col w-full h-full p-6">
                
                {/* Top Menu Bar */}
                <MenuBar
                    project={project}
                    user={user}
                    addCollaborator={addCollaborator}
                    setTitle={setTitle}
                    setModalContents={setModalContents}
                />

                {/* Main Content Area */}
                <div className="relative mt-4 flex flex-row flex-1 w-full overflow-hidden">
                    {/* Main Content Panel - occupies the available space */}
                    <div className={`flex flex-col flex-1 h-full overflow-y-auto transition-all duration-300`}>
                        <div className="flex flex-row items-center justify-between mb-4">
                            <TabSelector
                                tabs={["content", "cards"]}
                                onTabChange={(tabName) => setTab(tabName as "content" | "cards")}
                            />
                            <div className="pl-4">
                                <div className="relative inline-block">
                                    <div className={`absolute right-full mr-2 top-1/2 -translate-y-1/2 flex space-x-4 transition-all duration-300 ${filtersExpanded ? 'opacity-100' : 'opacity-0'}`}>
                                        <button
                                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${knowledgeShown ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                                            onClick={toggleKnowledge}
                                        >
                                            Show Knowledge Cards
                                        </button>
                                        <button
                                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${resourceShown ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                                            onClick={toggleResource}
                                        >
                                            Show Resource Cards
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                                        className="px-3 py-1 text-sm bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] rounded-md transition-colors duration-200"
                                    >
                                        Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                            <ContentPanel
                                hierarchy={project.hierarchy}
                                cards={project.cards}
                                hidden={tab !== "content"}
                                cardFilters={cardFilters}
                                addAttachment={(attachment: ChatAttachment) =>
                                    setChatAttachments((prev) => {
                                        // Start with empty array if null
                                        const current = prev ?? [];

                                        // Remove existing instance of this attachment
                                        const filtered = current.filter(att => att !== attachment);

                                        // Prepend the new attachment
                                        return [attachment, ...filtered];
                                    })
                                }
                                setClickedCard={setCardPopup}
                            />
                            <CardsPanel
                                project={project}
                                onCardClick={(card: Card) => setCardPopup(card)}
                                hidden={tab === "content"}
                                cardFilters={cardFilters}
                            />
                    </div>
                    <ChatPanel
                        project={project}
                        setModalContents={setModalContents}
                        attachments={chatAttachments}
                        setAttachments={setChatAttachments}
                        setClickedCard={setCardPopup}
                    />
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={modalContents.isOpen}
                type={modalContents.type}
                width={modalContents.width}
                message={modalContents.message}
                onClose={closeModal}
                onSubmit={async (input: string) => {
                    modalContents.onSubmit?.(input);
                    closeModal();
                }}
                onProceed={modalContents.onProceed}
                title={modalContents.title}
                initialValue={modalContents.initialValue || ""}
                placeholder={modalContents.placeholder}
            >{modalContents.children}</Modal>


            {/* Card Popup */}
            {cardPopup && (
                <CardPopup
                    card={cardPopup}
                    onClose={() => setCardPopup(null)}
                />
            )}
        </div>
    );
};

export default Editor;
