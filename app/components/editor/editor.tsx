"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/projects";
import Modal from "../modal";

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
                <h1 className="text-[var(--foreground)] text-2xl font-bold">{project.name}</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                    Share
                </button>
            </div>

            {/* Collaborators Info */}
            <p className="text-[var(--foreground)] mb-2">
                <strong>ID:</strong> {project.id}
            </p>
            <p className="text-[var(--foreground)] mb-4">
                <strong>Collaborators:</strong>{" "}
                {project.collaborators?.filter(Boolean).length
                    ? project.collaborators.filter(Boolean).join(", ")
                    : "None"}
            </p>

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
