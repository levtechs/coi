"use client";

import React, { useState, useRef, useEffect } from "react";
import { FiLock, FiMoreVertical, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Course } from "@/lib/types";
import { deleteCourse } from "@/app/views/courses";

type CourseCardProps = {
    course: Course;
};

export default function CourseCard({ course }: CourseCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({ top: rect.bottom + 4, left: rect.left });
        }
        setIsMenuOpen((prev) => !prev);
    };

    return (
        <div
            className="relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] shadow hover:shadow-md transition cursor-pointer group min-h-[120px] flex flex-col"
            onClick={() => window.location.assign(`/courses/${course.id}`)}
        >
            {/* Menu Button */}
            <div
                ref={buttonRef}
                className="absolute top-2 right-2 p-1 rounded-md hover:bg-[var(--neutral-300)]"
                onClick={handleMenuToggle}
            >
                <FiMoreVertical className="text-[var(--foreground)]" size={18} />
            </div>

            {/* Lock Icon for private courses */}
            {!course.public && (
                <div className="absolute top-2 left-2">
                    <FiLock className="text-[var(--neutral-700)]" size={20} />
                </div>
            )}

            {/* Course Info */}
            <h3 className="text-[var(--foreground)] font-semibold text-xl line-clamp-2 mb-2">
                {course.title}
            </h3>
            {course.description && (
                <p className="text-[var(--foreground)] text-sm opacity-70 flex-grow line-clamp-3">
                    {course.description}
                </p>
            )}

            {/* Dropdown Menu */}
            <MenuDropdown
                isOpen={isMenuOpen}
                position={menuPosition}
                onClose={() => setIsMenuOpen(false)}
                menuRef={menuRef}
                course={course}
            />
        </div>
    );
}

const MenuDropdown = ({
    isOpen,
    position,
    onClose,
    menuRef,
    course,
}: {
    isOpen: boolean;
    position: { top: number; left: number };
    onClose: () => void;
    menuRef: React.RefObject<HTMLDivElement>;
    course: Course;
}) => {
    if (!isOpen) return null;
    return (
        <div
            className="fixed w-32 bg-[var(--neutral-400)] rounded-md shadow-lg py-1 z-50"
            style={{ top: position.top, left: position.left }}
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="flex items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)] cursor-pointer"
                onClick={() => {
                    onClose();
                    window.location.assign(`/courses?edit=${course.id}`);
                }}
            >
                <FiEdit2 size={16} /> Edit
            </div>
            <div
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-[var(--neutral-200)] cursor-pointer"
                onClick={async () => {
                    onClose();
                    if (confirm("Are you sure you want to delete this course?")) {
                        const success = await deleteCourse(course.id);
                        if (success) {
                            window.location.reload();
                        }
                    }
                }}
            >
                <FiTrash2 size={16} /> Delete
            </div>
        </div>
    );
};

