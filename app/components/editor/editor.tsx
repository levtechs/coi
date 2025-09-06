"use client";

import { useState } from "react";

import { Project, Card } from "@/lib/types";

import Modal from "../modal";
import MenuBar from "./menu/menu";
import ContentPanel from "./content";
import ChatPanel from "./chat/chat";
import { noModal } from "./types";
import TabSelector from "./tab_selector";
import CardsPanel from "./cards/cards_panel";
import CardPopup from "./cards/card_popup";
import Button from "../button";

interface EditorProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setTitle: (projectId: string, newTitle: string) => Promise<void>;
}

const Editor = ({
    project,
    user,
    setProject,
    addCollaborator,
    setTitle,
}: EditorProps) => {
    const [tab, setTab] = useState<"content" | "cards">("content"); // "content" or "cards"
    const [chatToggled, setChatToggled] = useState(true);

    const [modalContents, setModalContents] = useState(noModal);
    const closeModal = () => setModalContents(noModal);

    const [cardPopup, setCardPopup] = useState<Card | null>(null);

    return (
        <div className="p-6 mx-4 sm:mx-6 lg:mx-12 w-auto bg-[var(--neutral-100)] rounded-lg shadow-lg mt-8">
            {/* Top Menu Bar */}
            <MenuBar
                project={project}
                user={user}
                setProject={setProject}
                addCollaborator={addCollaborator}
                setTitle={setTitle}
                setModalContents={setModalContents}
            />

            {/* Main Layout */}
            <div className="relative mt-4">
                {/* Main Content Panel - occupies the available space with a right margin */}
                <div className={`mr-80 md:mr-96 ${chatToggled ? "max-w-[50vw]": "w-full"} transition-all duration-300`}>
                    <TabSelector
                        tabs={["content", "cards"]}
                        onTabChange={(tabName) => setTab(tabName as "content" | "cards")}
                    />
                    {tab === "content" ? (
                        <ContentPanel
                            project={project}
                        />
                    ) : (
                        <CardsPanel 
                            project={project} 
                            onCardClick={(card: Card) => setCardPopup(card)}
                        />
                    )}

                </div>

                {/* Chat Panel - fixed to the viewport and always centered */}
                <div className="fixed top-1/2 -translate-y-1/2 right-6">
                    <ChatPanel 
                        project={project} 
                        setProject={setProject}
                        toggleChat={setChatToggled} 
                    />
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={modalContents.isOpen}
                onClose={closeModal}
                onSubmit={async (input: string) => {
                    modalContents.onSubmit?.(input);
                    closeModal();
                }}
                title={modalContents.title}
                initialValue={modalContents.initialValue || ""}
                placeholder={modalContents.placeholder}
            />

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
