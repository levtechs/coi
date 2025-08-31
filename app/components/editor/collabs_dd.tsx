"use client";

import { useState, useRef, useEffect } from "react";

import { FaCrown } from "react-icons/fa";
import { FiUser } from "react-icons/fi";

import Button from "@/app/components/button";

import { auth } from "@/lib/firebase";
import { getEmailFromUserId } from "@/app/views/users"

interface CollaboratorsDropdownProps {
    collaborators: string[];
    ownerId: string
}

export default function CollaboratorsDropdown({ collaborators, ownerId}: CollaboratorsDropdownProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [owner, setOwner] = useState<String | null>();

    const currentUserEmail = auth.currentUser?.email;

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

    useEffect(() => {
        if (!ownerId) return;

        async function fetchOwnerEmail() {
            const result = await getEmailFromUserId(ownerId);
            setOwner(result);
        }

        fetchOwnerEmail();
    }, [ownerId]);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <Button color="var(--neutral-300)" onClick={() => setOpen(!open)}>
                Collaborators
            </Button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--neutral-100)] shadow-lg rounded-md border border-[var(--neutral-300)] z-50">
                    <ul className="py-1 max-h-60 overflow-y-auto">
                        <li
                            key={0}
                            className="flex items-center gap-x-2 px-4 py-2 text-[var(--foreground)] hover:bg-[var(--neutral-200)] cursor-default transition"
                        >
                            {owner || "Unknown owner"}
                            <FaCrown className="text-[var(--accent-500)]" />
                            {owner === currentUserEmail && <FiUser className="text-[var(--accent-500)]" />}
                        </li>

                        {collaborators
                            .filter(Boolean)
                            .map((email, index) => (
                                <li
                                    key={index}
                                    className="flex items-center gap-x-2 px-4 py-2 text-[var(--foreground)] hover:bg-[var(--neutral-200)] cursor-default transition"
                                >
                                    {email}
                                    {email === currentUserEmail && <FiUser className="text-[var(--accent-500)]" />}
                                </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
