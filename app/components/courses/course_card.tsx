"use client";

import React, { useState, useRef, useEffect } from "react";
import { FiLock, FiMoreVertical, FiEdit2, FiTrash2, FiBarChart } from "react-icons/fi";
import { Course } from "@/lib/types/course";
import { courseListCoverUrl } from "@/lib/courseBranding";
import { deleteCourse } from "@/app/views/courses";
import { useAuth } from "@/lib/AuthContext";

type CourseCardProps = {
    course: Course;
};

export default function CourseCard({ course }: CourseCardProps) {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    const isOwner = user && course.ownerId === user.uid;
    const coverUrl = courseListCoverUrl(course);

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
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--neutral-300)] bg-[var(--neutral-200)] shadow-sm transition hover:border-[var(--accent-500)]/40 hover:shadow-lg"
            onClick={() => window.location.assign(`/courses/${course.id}`)}
        >
            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-gradient-to-br from-[var(--neutral-300)] to-[var(--neutral-400)]">
                {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary course URLs
                    <img
                        src={coverUrl}
                        alt={`${course.title} cover`}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--neutral-600)]">
                        <span className="text-sm font-medium opacity-80">Course</span>
                    </div>
                )}
                {!course.public && (
                    <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                        <FiLock size={16} />
                    </div>
                )}
                {isOwner && (
                    <div
                        ref={buttonRef}
                        className="absolute right-2 top-2 rounded-lg bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/55"
                        onClick={handleMenuToggle}
                    >
                        <FiMoreVertical size={18} />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-[var(--foreground)]">
                    {course.title}
                </h3>
                {course.description && (
                    <p className="mb-3 line-clamp-2 flex-1 text-sm text-[var(--foreground)] opacity-70">
                        {course.description}
                    </p>
                )}
                <p className="mt-auto text-xs italic text-[var(--foreground)] opacity-55">
                    {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                    {course.quizIds && course.quizIds.length > 0 ? " · Final quiz" : ""}
                </p>
            </div>

            {isOwner && (
                <MenuDropdown
                    isOpen={isMenuOpen}
                    position={menuPosition}
                    onClose={() => setIsMenuOpen(false)}
                    menuRef={menuRef}
                    course={course}
                />
            )}
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
    menuRef: React.RefObject<HTMLDivElement | null>;
    course: Course;
}) => {
    if (!isOpen) return null;
    return (
        <div
            className="fixed z-50 w-32 rounded-md bg-[var(--neutral-400)] py-1 shadow-lg"
            style={{ top: position.top, left: position.left }}
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
        >
             <div
                 className="flex cursor-pointer items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)]"
                 onClick={() => {
                     onClose();
                     window.location.assign(`/courses?edit=${course.id}`);
                 }}
             >
                 <FiEdit2 size={16} /> Edit
             </div>
             <div
                 className="flex cursor-pointer items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)]"
                 onClick={() => {
                     onClose();
                     window.location.assign(`/courses/${course.id}?analytics`);
                 }}
             >
                 <FiBarChart size={16} /> Analytics
             </div>
             <div
                 className="flex cursor-pointer items-center gap-2 px-4 py-2 text-red-500 hover:bg-[var(--neutral-200)]"
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
