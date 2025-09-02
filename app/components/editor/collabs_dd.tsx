"use client";

import { useState, useRef, useEffect } from "react";

import { FaCrown } from "react-icons/fa";
import { FiUser, FiLoader} from "react-icons/fi";

import Button from "@/app/components/button";
import { auth } from "@/lib/firebase";
import { getUserFromId } from "@/app/views/users";
import { User } from "@/lib/types";

interface CollaboratorsDropdownProps {
    sharedWith: string[];
    ownerId: string;
}

export default function CollaboratorsDropdown({ sharedWith, ownerId }: CollaboratorsDropdownProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [owner, setOwner] = useState<User | null>(null);
    const [isOwnerMe, setIsOwnerMe] = useState(false);

    const [users, setUsers] = useState<User[]>([]);

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

    // Fetch owner and all collaborators, and set flags
    useEffect(() => {
        if (!ownerId || !currentUserEmail) return;

        const fetchAllUsers = async () => {
            setLoading(true);
            try {
                // Fetch the owner and all collaborators concurrently
                const userIdsToFetch = [ownerId, ...(sharedWith || [])];
                const usersData = await Promise.all(userIdsToFetch.map(id => getUserFromId(id)));
                
                // Filter out any users that were not found and set the state
                const validUsers = usersData.filter((u): u is User => u !== null);
                setUsers(validUsers);

                // Find the owner from the fetched list and set the state
                const fetchedOwner = validUsers.find(u => u.id === ownerId);
                setOwner(fetchedOwner || null);

                // Check if the current user is the owner
                setIsOwnerMe(fetchedOwner?.email?.toLowerCase() === currentUserEmail.toLowerCase());

            } catch (err) {
                console.error("Failed to fetch user data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllUsers();
    }, [ownerId, sharedWith, currentUserEmail]);

    // Render nothing until owner is loaded
    if (loading) return <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />;

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <Button color="var(--neutral-300)" onClick={() => setOpen(!open)}>
                Collaborators
            </Button>

            {open && (
                <div className="absolute right-0 mt-2 w-50 bg-[var(--neutral-100)] shadow-lg rounded-md border border-[var(--neutral-300)] z-50">
                    <ul className="py-1 max-h-60 overflow-y-auto">
                    {/* Owner */}
                    <li
                        key={owner?.id || "owner-placeholder"}
                        className="flex items-center gap-x-2 px-4 py-2 text-[var(--foreground)] hover:bg-[var(--neutral-200)] cursor-default transition"
                    >
                        <span className="flex items-center gap-x-1">
                            {owner?.displayName || "Unknown owner"}
                            <FaCrown className="text-[var(--accent-500)]" />
                            {isOwnerMe && <FiUser className="text-[var(--accent-500)]" />}
                        </span>
                    </li>

                    {/* Collaborators - filter out the owner to prevent duplication */}
                    {users
                        .filter(user => user.id !== owner?.id)
                        .map(user => (
                            <li
                                key={user.id}
                                className="flex items-center gap-x-2 px-4 py-2 text-[var(--foreground)] hover:bg-[var(--neutral-200)] cursor-default transition"
                            >
                                {user.displayName}
                                {user.email.toLowerCase() === currentUserEmail.toLowerCase() && (
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
