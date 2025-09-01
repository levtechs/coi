"use client";

import { useState, useRef, useEffect } from "react";

import { FaCrown } from "react-icons/fa";
import { FiUser, FiLoader} from "react-icons/fi";

import Button from "@/app/components/button";
import { auth } from "@/lib/firebase";
import { getEmailFromUserId } from "@/app/views/users";

interface CollaboratorsDropdownProps {
    collaborators: string[];
    ownerId: string;
}

export default function CollaboratorsDropdown({ collaborators, ownerId }: CollaboratorsDropdownProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [owner, setOwner] = useState<string | null>(null);
    const [isOwnerMe, setIsOwnerMe] = useState(false);
    const [loading, setLoading] = useState(true);

    const currentUserEmail = auth.currentUser?.email ?? "";

    // Close dropdown if clicked outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch owner email and set flags
    useEffect(() => {
        if (!ownerId || !currentUserEmail) return;

        const fetchOwnerEmail = async () => {
            setLoading(true);
            try {
                const email = await getEmailFromUserId(ownerId);
                setOwner(email);
                setIsOwnerMe(email?.toLowerCase() === currentUserEmail.toLowerCase());
            } catch (err) {
                console.error("Failed to fetch owner email:", err);
            } finally {
                setLoading(false);
                console.log(owner)
            }
        };

        fetchOwnerEmail();
    }, [ownerId, currentUserEmail]);

    // Render nothing until owner is loaded
    if (loading) return <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />;

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <Button color="var(--neutral-300)" onClick={() => setOpen(!open)}>
                Collaborators
            </Button>

            {open && (
                <div className="absolute right-0 mt-2 max-w-70 bg-[var(--neutral-100)] shadow-lg rounded-md border border-[var(--neutral-300)] z-50">
                    <ul className="py-1 max-h-60 overflow-y-auto">
                        {/* Owner */}
                        <li
                            key={0}
                            className="flex items-center gap-x-2 px-4 py-2 text-[var(--foreground)] hover:bg-[var(--neutral-200)] cursor-default transition"
                        >
                            <span className="flex items-center gap-x-1">
                                {owner || "Unknown owner"}
                                <FaCrown className="text-[var(--accent-500)]" />
                                {isOwnerMe && <FiUser className="text-[var(--accent-500)]" />}
                            </span>
                        </li>

                        {/* Collaborators */}
                        {collaborators
                            .filter(Boolean)
                            .map((email, index) => (
                                <li
                                    key={index + 1}
                                    className="flex items-center gap-x-2 px-4 py-2 text-[var(--foreground)] hover:bg-[var(--neutral-200)] cursor-default transition"
                                >
                                    {email}
                                    {email.toLowerCase() === currentUserEmail.toLowerCase() && (
                                        <FiUser className="text-[var(--accent-500)]" />
                                    )}
                                </li>
                            ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
