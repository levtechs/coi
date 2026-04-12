"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FiLock, FiMoreVertical, FiEdit2, FiTrash2, FiBarChart } from "react-icons/fi";
import { Course } from "@/lib/types/course";
import { courseListCoverUrl } from "@/lib/courseBranding";
import { deleteCourse } from "@/app/views/courses";
import { useAuth } from "@/lib/AuthContext";

type CourseCardProps = {
    course: Course;
    /** Shown as a pill on the card (e.g. formatted category). */
    categoryTag?: string;
};

export default function CourseCard({ course, categoryTag }: CourseCardProps) {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

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
        e.preventDefault();
        e.stopPropagation();
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({ top: rect.bottom + 4, left: rect.left });
        }
        setIsMenuOpen((prev) => !prev);
    };

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--neutral-300)] bg-[var(--neutral-200)] shadow-sm transition hover:border-[var(--accent-500)]/40 hover:shadow-lg">
            <Link
                href={`/courses/${course.id}`}
                className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-500)]"
                aria-label={`Open course: ${course.title}`}
            />
            <div className="pointer-events-none relative z-[1]">
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
                    {categoryTag !== undefined && (
                        <span
                            className={`pointer-events-none absolute left-3 top-3 z-[2] max-w-[min(14rem,calc(100%-3.5rem))] truncate rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm ${
                                course.category
                                    ? "border-white/25 bg-black/50 text-white"
                                    : "border-white/20 bg-black/40 text-white/95"
                            }`}
                        >
                            {categoryTag}
                        </span>
                    )}
                    {!course.public && (
                        <div
                            className={`pointer-events-none absolute left-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm ${
                                categoryTag !== undefined ? "top-11" : "top-3"
                            }`}
                        >
                            <FiLock size={16} aria-hidden />
                        </div>
                    )}
                    {isOwner && (
                        <button
                            type="button"
                            ref={buttonRef}
                            aria-label="Open course menu"
                            aria-expanded={isMenuOpen}
                            aria-haspopup="menu"
                            className="pointer-events-auto absolute right-2 top-2 z-[3] rounded-lg bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/55"
                            onClick={handleMenuToggle}
                        >
                            <FiMoreVertical size={18} aria-hidden />
                        </button>
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
            role="menu"
            onClick={(e) => e.stopPropagation()}
        >
            <Link
                href={`/courses?edit=${course.id}`}
                role="menuitem"
                className="flex cursor-pointer items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)]"
                onClick={onClose}
            >
                <FiEdit2 size={16} aria-hidden /> Edit
            </Link>
            <Link
                href={`/courses/${course.id}?analytics`}
                role="menuitem"
                className="flex cursor-pointer items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)]"
                onClick={onClose}
            >
                <FiBarChart size={16} aria-hidden /> Analytics
            </Link>
            <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-red-500 hover:bg-[var(--neutral-200)]"
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
                <FiTrash2 size={16} aria-hidden /> Delete
            </button>
        </div>
    );
};
