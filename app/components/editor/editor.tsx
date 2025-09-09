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
    const [modalContents, setModalContents] = useState(noModal);
    const closeModal = () => setModalContents(noModal);
    const [cardPopup, setCardPopup] = useState<Card | null>(null);

    return (
        <div className="flex flex-col h-dvh w-full bg-[var(--neutral-100)] text-[var(--foreground)]">
            {/* Main Layout Container */}
            <div className="flex flex-col w-full h-full p-6">
                
                {/* Top Menu Bar */}
                <MenuBar
                    project={project}
                    user={user}
                    setProject={setProject}
                    addCollaborator={addCollaborator}
                    setTitle={setTitle}
                    setModalContents={setModalContents}
                />

                {/* Main Content Area */}
                <div className="relative mt-4 flex flex-row flex-1 w-full overflow-hidden">
                    {/* Main Content Panel - occupies the available space */}
                    <div className={`flex flex-col flex-1 h-full overflow-y-auto transition-all duration-300`}>
                        <TabSelector
                            tabs={["content", "cards"]}
                            onTabChange={(tabName) => setTab(tabName as "content" | "cards")}
                        />
                        <div className="h-4" > 
                            <ContentPanel
                                project={project}
                                hidden={tab !== "content"}
                            />
                            <CardsPanel 
                                project={project} 
                                onCardClick={(card: Card) => setCardPopup(card)}
                                hidden={tab === "content"}
                            />
                        </div>

                    </div>

                    <ChatPanel 
                        project={project} 
                        setProject={setProject}
                    />
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={modalContents.isOpen}
                type={modalContents.type}
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
