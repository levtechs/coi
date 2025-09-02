"use client";

import { useState } from "react";

import { Project } from "@/lib/types";
import Modal from "../modal";
import MenuBar from "./menu";
import ContentPanel from "./content";
import ChatPanel from "./chat/chat";
import { noModal } from "./types";

interface EditorProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setTitle: (projectId: string, newTitle: string) => Promise<void>;
    setContent: (projectId: string, newContent: string) => Promise<void>;
}

const Editor = ({
    project,
    user,
    setProject,
    addCollaborator,
    setTitle,
    setContent,
}: EditorProps) => {
    const [modalContents, setModalContents] = useState(noModal);
    const closeModal = () => setModalContents(noModal);

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
                <div className="mr-80 md:mr-96 max-w-[40vw]">
                    <ContentPanel
                        project={project}
                        user={user}
                        setProject={setProject}
                        setContent={setContent}
                        setModalContents={setModalContents}
                    />
                </div>

                {/* Chat Panel - fixed to the viewport and always centered */}
                <div className="fixed top-1/2 -translate-y-1/2 right-6">
                    <ChatPanel project={project} setProject={setProject} />
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
        </div>
    );
};

export default Editor;
