"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/projects";

import { FiEdit2 } from "react-icons/fi";

import Modal from "../modal";
import Button from "../button";
import CollaboratorsDropdown from "./collabs_dd";

interface EditorProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    addCollaborator: (uid: string, projectId: string, email: string) => Promise<void>;
    changeTitle: (uid: string, projectId: string, newTitle: string) => Promise<void>;
}

const noModal = {isOpen: false} as ModalContents;

interface ModalContents {
    isOpen: boolean;
    onSubmit?: (input: string) => void;
    title?: string;
    initialValue?: string;
    placeholder?: string;
}

const Editor = ({ project, user, setProject, addCollaborator, changeTitle }: EditorProps) => {
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
            <div className="flex items-center justify-between mb-4 border-b border-[var(--neutral-300)] pb-4">
                
                {/* Project Title with edit icon on the right */}
                <div className="flex items-center justify-between group gap-3">
                    <h1 className="text-[var(--foreground)] text-2xl font-bold">{project.title}</h1>
                    <FiEdit2
                        className="text-[var(--accent-500)] cursor-pointer opacity-0 group-hover:opacity-100 hover:text-[var(--accent-600)] transition"
                        size={20}
                        onClick={() => setModalContents({ isOpen: true, title: "Edit title", initialValue: "", placeholder: "Enter new title", onSubmit: async (input) => {
                            if (!user || !input.trim()) return;

                            // Update the title in the database
                            await changeTitle(user.uid, project.id, input);

                            // Update local state
                            setProject((prev) =>
                                prev
                                    ? { ...prev, title: input.trim() }
                                    : prev
                            );
                        }})}
                    />
                </div>

                {/* Right side: Share + Collaborators */}
                <div className="flex items-center gap-4">
                    <CollaboratorsDropdown collaborators={project.collaborators || []} />
                    <Button
                        onClick={() => setModalContents({ isOpen: true, title: "Share Project", initialValue: "", placeholder: "Enter email", onSubmit: async (input) =>{
                            if (!user) return;

                            // Add collaborator in DB
                            await addCollaborator(user.uid, project.id, input);

                            // Update local state
                            setProject((prev) =>
                                prev
                                    ? {
                                        ...prev,
                                        collaborators: [...(prev.collaborators ?? []), input],
                                    }
                                    : prev
                            );
                        }})}
                        color="var(--accent-500)"
                    >
                        Share
                    </Button>
                </div>
            </div>

            {/* Main Content + Chat Panels */}
            <div className="flex gap-6 mt-4">
                {/* Main Content Panel */}
                <div className="flex-1">
                    <div className="relative group p-3 bg-[var(--neutral-200)] rounded-md text-[var(--foreground)] whitespace-pre-wrap">
                        {/* Edit Icon */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                            <FiEdit2
                                className="text-[var(--accent-500)] cursor-pointer hover:text-[var(--accent-600)]"
                                size={20}
                                onClick={() => onEditContent && onEditContent(project)}
                            />
                        </div>

                        <h2 className="text-[var(--foreground)] text-xl font-semibold mb-2">Content</h2>
                        {project.content || "(No content)"}
                    </div>
                </div>

                {/* Chat Panel */}
                <div className="w-[50%] bg-[var(--neutral-200)] rounded-md p-3">
                    <h2 className="text-[var(--foreground)] text-xl font-semibold mb-2">Chat</h2>
                    {/* Chat content will go here */}
                </div>
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
