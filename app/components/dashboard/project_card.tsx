"use client";

import React, { useState, useRef, useEffect } from "react";

import { FiEdit2, FiLoader, FiMoreVertical, FiTrash2 } from "react-icons/fi";

import { Project } from "@/lib/types";

import { deleteProject, getProjects } from "@/app/views/projects";

type ProjectCardProps = {
    project: Project;
    onEdit: (project: Project) => void;
    setProjects: (projects: Project[]) => void;
};

export default function ProjectCard({ project, onEdit, setProjects }: ProjectCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    const [isLoading, setLoading] = useState(false);

    // This effect handles closing the menu when a click occurs outside of it.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if the click is outside of both the menu and the button that opened it.
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

    if (isLoading) {
        return (
            <div
                className="relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] shadow hover:shadow-md transition cursor-pointer group"
                onClick={() => window.location.assign(`/projects/${project.id}`)}
            >
                <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />
            </div>
        );

    };

    return (
        <div
            className="relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] shadow hover:shadow-md transition cursor-pointer group"
            onClick={() => window.location.assign(`/projects/${project.id}`)}
        >
            <h3 className="text-[var(--foreground)] font-semibold text-xl line-clamp-2">{project.title}</h3>

            {/* Three Dots Icon */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition" ref={buttonRef}>
                <FiMoreVertical
                    className="text-[var(--neutral-700)] cursor-pointer hover:text-[var(--accent-500)]"
                    size={20}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                    }}
                />
            </div>

            {/* Menu Dropdown */}
            {isMenuOpen && (
                <div
                    className="absolute top-8 right-2 w-32 bg-[var(--neutral-400)] rounded-md shadow-lg py-1 z-10"
                    ref={menuRef}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="flex items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)] cursor-pointer"
                        onClick={() => {
                            onEdit(project);
                            setIsMenuOpen(false);
                        }}
                    >
                        <FiEdit2 size={16} /> Edit
                    </div>
                    <div
                        className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-[var(--neutral-200)] cursor-pointer"
                        onClick={async () => {
                            setIsMenuOpen(false);
                            await deleteProject(project.id);
                            const fetchProjects = async () => {
                                setLoading(true);
                                try {
                                    const projects: Project[] = await getProjects();
                                    setProjects(projects);
                                } catch (err) {
                                    console.error("Failed to fetch projects:", err);
                                }
                                finally {
                                    setLoading(false);
                                }
                            };

                            fetchProjects();
                        }}
                    >
                        <FiTrash2 size={16} /> Delete
                    </div>
                </div>
            )}
        </div>
    );
}
