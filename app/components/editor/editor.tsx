"use client";

import { useState } from "react";

import { Project } from "@/lib/projects";

import Modal from "../modal";
import Button from "../button";

import MenuBar from "./menu";
import ContentPanel from "./content";
import ChatPanel from "./chat/chat";

import { noModal} from "./types";

interface EditorProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setTitle: (projectId: string, newTitle: string) => Promise<void>;
    setContent: (projectId: string, newContent: string) => Promise<void>;
}

const Editor = ({ project, user, setProject, addCollaborator, setTitle, setContent}: EditorProps) => {
    const [modalContents, setModalContents] = useState(noModal);
    const closeModal = () => setModalContents(noModal);

    // Optional: subscribe to project updates from DB for real-time syncing
    // useEffect(() => {
    //     if (!user) return;
    //     const unsubscribe = subscribeToProject(user.uid, project.id, setProject);
    //     return () => unsubscribe();
    // }, [user, project.id, setProject]);

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

            {/* Main Content + Chat Panels */}
            <div className="flex gap-6 mt-4">
                {/* Main Content Panel */}
                <ContentPanel 
                    project={project}
                    user={user}
                    setProject={setProject}
                    setContent={setContent}
                    setModalContents={setModalContents}
                />

                {/* Chat Panel */}
                <ChatPanel 
                    project={project}
                    user={user}
                    setProject={setProject}
                    setContent={setContent}
                    setModalContents={setModalContents}
                />
            </div>

            {/* Share Modal */}
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
