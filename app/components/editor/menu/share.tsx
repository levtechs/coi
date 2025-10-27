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
}

const ShareMenu = ({ project, user, setModalContents, addCollaborator }: ShareMenuProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    const handleOpenShareModal = () => {
        setIsMenuOpen(false); // Close menu after selection
        setModalContents({
            isOpen: true,
            type: "input",
            title: "Share Project",
            initialValue: "",
            placeholder: "Enter email",
            onSubmit: async (input) => {
                if (!user) return;
                await addCollaborator(project.id, input!);
            },
        });
    };

    const handleInviteClick = () => {
        setIsMenuOpen(false);
        setModalContents({
            isOpen: true,
            type: "empty",
            width: "md",
            title: "Share Project",
            children: <InvitePanel project={project} onClose={() => setModalContents({isOpen: false, type: "empty"})} />
        });
    };

    const handleShareClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <>
            <div className="relative">
                <Button
                    onClick={handleShareClick}
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
                            onClick={handleInviteClick}
                            className="flex items-center gap-2 px-4 py-2 text-[var(--accent-500)] hover:bg-[var(--neutral-200)] cursor-pointer font-bold"
                        >
                            Invite
                        </div>
                        <div
                            onClick={handleOpenShareModal}
                            className="flex items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)] cursor-pointer"
                        >
                            Add Collaborator
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default ShareMenu;
