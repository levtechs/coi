"use client";

import { useState } from "react";
import { Project, Card, ChatAttachment, CardFilter, DEFAULT_CARD_FILTER } from "@/lib/types";
import Modal from "../modal";
import MenuBar from "./menu/menu";
import ContentPanel from "./content";
import ChatPanel from "./chat/chat";
import { noModal } from "./types";
import CardsPanel from "./cards/cards_panel";
import CardPopup from "./cards/card_popup";

interface EditorProps {
    project: Project;
    user: { uid: string } | null;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setTitle: (projectId: string, newTitle: string) => Promise<void>;
    setProject: (project: Project) => void;
}

const Editor = ({
    project,
    user,
    addCollaborator,
    setTitle,
    setProject,
}: EditorProps) => {
    const [tab, setTab] = useState<"content" | "cards">("content"); // "content" or "cards"

    const [cardFilters, setCardFilters] = useState<CardFilter>(DEFAULT_CARD_FILTER);
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    const toggleKnowledge = () => {
        setCardFilters(prev => ({ ...prev, knowledge: !prev.knowledge }));
    };

    const toggleResource = () => {
        setCardFilters(prev => ({ ...prev, resource: !prev.resource }));
    };

    const toggleImportant = () => {
        setCardFilters(prev => ({ ...prev, important: !prev.important }));
    };

    const [modalContents, setModalContents] = useState(noModal);
    const closeModal = () => setModalContents(noModal);

    const [chatAttachments, setChatAttachments] = useState<null | ChatAttachment[]>(null);
    const [cardPopup, setCardPopup] = useState<Card | null>(null);
    const [chatFullscreen, setChatFullscreen] = useState(false);


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
                    tab={tab}
                    setTab={setTab}
                    cardFilters={cardFilters}
                    filtersExpanded={filtersExpanded}
                    setFiltersExpanded={setFiltersExpanded}
                    toggleKnowledge={toggleKnowledge}
                    toggleResource={toggleResource}
                    toggleImportant={toggleImportant}
                />

                {/* Main Content Area */}
                <div className="relative mt-4 flex flex-row flex-1 w-full overflow-hidden">
                    {/* Main Content Panel - occupies the available space */}
                    <div className={`flex flex-col flex-1 h-full overflow-y-auto transition-all duration-300 ${chatFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            <ContentPanel
                                hierarchy={project.hierarchy}
                                cards={project.cards}
                                hidden={tab !== "content"}
                                cardFilters={cardFilters}
                                project={project}
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
                                projectId={project.id}
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
                        onFullscreenChange={setChatFullscreen}
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
