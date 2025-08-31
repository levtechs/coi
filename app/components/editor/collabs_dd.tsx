"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/app/components/button";

interface CollaboratorsDropdownProps {
    collaborators: string[];
}

export default function CollaboratorsDropdown({ collaborators }: CollaboratorsDropdownProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <Button color="var(--neutral-300)" onClick={() => setOpen(!open)}>
                Collaborators
            </Button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--neutral-100)] shadow-lg rounded-md border border-[var(--neutral-300)] z-50">
                    <ul className="py-1 max-h-60 overflow-y-auto">
                        {collaborators.filter(Boolean).length > 0 ? (
                            collaborators
                                .filter(Boolean)
                                .map((email, index) => (
                                    <li
                                        key={index}
                                        className="px-4 py-2 text-[var(--foreground)] hover:bg-[var(--neutral-200)] cursor-default transition"
                                    >
                                        {email}
                                    </li>
                                ))
                        ) : (
                            <li className="px-4 py-2 text-[var(--foreground)] italic">
                                No collaborators
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
