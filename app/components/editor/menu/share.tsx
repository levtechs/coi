"use client";

import React, { useState, useRef, useEffect } from "react";

import Button from "../../button";
import InvitePanel from "./invite_panel";

import { Project } from "@/lib/types";
import { ModalContents } from "../types";

interface ShareMenuProps {
    project: Project;
    user: { uid: string } | null;
    setModalContents: (newContent: ModalContents) => void;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
}

const ShareMenu = ({ project, user, setModalContents, addCollaborator, setProject }: ShareMenuProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const [isInviteOpen, setIsInviteOpen] = useState(false);

    // Handles closing the menu when a click occurs outside of it.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleAddCollaborator = () => {
        setIsMenuOpen(false); // Close menu after selection
        setModalContents({
            isOpen: true,
            title: "Share Project",
            initialValue: "",
            placeholder: "Enter email",
            onSubmit: async (input) => {
                if (!user) return;
                await addCollaborator(project.id, input);
                setProject((prev) =>
                    prev
                        ? {
                            ...prev,
                            collaborators: [
                                ...(prev.collaborators ?? []),
                                input,
                            ],
                        }
                        : prev
                );
            },
        });
    };

    const handleInvite = () => {
        setIsMenuOpen(false); // Close menu after selection
        setIsInviteOpen(true);
        // TODO: Implement invite logic here
        console.log("Invite option clicked");
    };

    return (
        <>
            <div className="relative">
                <Button
                    onClick={() => {
                        setIsMenuOpen(!isMenuOpen);
                    }}
                    color="var(--accent-500)"
                >
                    Share
                </Button>

                {isMenuOpen && (
                    <div
                        ref={menuRef}
                        className="absolute right-0 mt-2 w-48 bg-[var(--neutral-400)] rounded-md shadow-lg py-1 z-10"
                    >
                        <div
                            onClick={handleInvite}
                            className="flex items-center gap-2 px-4 py-2 text-[var(--accent-500)] hover:bg-[var(--neutral-200)] cursor-pointer font-bold"
                        >
                            Invite
                        </div>
                        <div
                            onClick={handleAddCollaborator}
                            className="flex items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)] cursor-pointer"
                        >
                            Add Collaborator
                        </div>
                    </div>
                )}
            </div>
            {isInviteOpen && (
                <InvitePanel
                    project={project}
                    onClose={() => setIsInviteOpen(false)}
                />
            )}
        </>
    );
}

export default ShareMenu;
