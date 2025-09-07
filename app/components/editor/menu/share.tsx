"use client";

import React, { useState, useRef, useEffect } from "react";
import Button from "../../button";
import InvitePanel from "./invite_panel";
import { FiShare2 } from "react-icons/fi";
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

    const isOwner = user?.uid === project.ownerId;

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
                setProject((prev) =>
                    prev
                        ? {
                            ...prev,
                            collaborators: [
                                ...(prev.collaborators ?? []),
                                input!,
                            ],
                        }
                        : prev
                );
            },
        });
    };

    const handleShareClick = () => {
        if (!isOwner) {
            setModalContents({
                isOpen: true,
                type: "error",
                title: "Permission Denied",
                message: "Only the project owner can share this project.",
                placeholder: "",
                onSubmit: () => {},
            });
        } else {
            setIsMenuOpen(!isMenuOpen);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <Button
                onClick={handleShareClick}
                color={isOwner ? "var(--accent-500)" : "var(--neutral-500)"}
                className="flex items-center gap-2"
            >
                <FiShare2 className="text-lg" />
                Share
            </Button>
            {isMenuOpen && (
                <div
                    className="absolute right-0 mt-2 w-48 bg-[var(--neutral-400)] rounded-md shadow-lg py-1 z-10"
                >
                    <div
                        onClick={() => alert("Invite option clicked")}
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
    );
}

export default ShareMenu;
