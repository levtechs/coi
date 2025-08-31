"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/projects";
import Modal from "../modal";
import Button from "../button";
import CollaboratorsDropdown from "./collabs_dd";

interface EditorProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    addCollaborator: (uid: string, projectId: string, email: string) => Promise<void>;
}

const Editor = ({ project, user, setProject, addCollaborator }: EditorProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState("");

    // Optional: subscribe to project updates from DB for real-time syncing
    // useEffect(() => {
    //     if (!user) return;
    //     const unsubscribe = subscribeToProject(user.uid, project.id, setProject);
    //     return () => unsubscribe();
    // }, [user, project.id, setProject]);

    return (
        <div className="p-6 max-w-3xl mx-auto bg-[var(--neutral-100)] rounded-lg shadow-lg mt-4">
            {/* Top Menu Bar */}
            <div className="flex items-center justify-between mb-4 border-b border-[var(--neutral-300)] pb-2">
                {/* Project Title */}
                <h1 className="text-[var(--foreground)] text-2xl font-bold">{project.name}</h1>

                {/* Right side: Share + Collaborators */}
                <div className="flex items-center gap-2">
                    <CollaboratorsDropdown collaborators={project.collaborators || []} />
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        color="var(--accent-500)"
                    >
                        Share
                    </Button>
                </div>
            </div>

            {/* Main Content Panel */}
            <div className="mt-4">
                <h2 className="text-[var(--foreground)] text-xl font-semibold mb-2">Content:</h2>
                <div className="p-3 bg-[var(--neutral-200)] rounded-md text-[var(--foreground)] whitespace-pre-wrap">
                    {project.content || "(No content)"}
                </div>
            </div>

            {/* Share Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEmail("");
                }}
                onSubmit={async (emailInput: string) => {
                    if (!user) return;

                    // Add collaborator in DB
                    await addCollaborator(user.uid, project.id, emailInput);

                    // Update local state
                    setProject((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  collaborators: [...(prev.collaborators ?? []), emailInput],
                              }
                            : prev
                    );

                    setIsModalOpen(false);
                    setEmail("");
                }}
                title="Share Project"
                initialValue={email}
                placeholder="Enter email"
            />
        </div>
    );
};

export default Editor;
