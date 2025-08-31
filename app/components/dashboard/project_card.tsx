"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { FiEdit2 } from "react-icons/fi";
import { Project } from "@/lib/types";

type ProjectCardProps = {
    project: Project;
    onEdit: (project: Project) => void;
};

export default function ProjectCard({ project, onEdit }: ProjectCardProps) {
    const router = useRouter();

    return (
        <div
            className="relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] shadow hover:shadow-md transition cursor-pointer group"
            onClick={() => window.open(`/projects/${project.id}`, "_blank")}
        >
            <h3 className="text-[var(--foreground)] font-semibold text-xl">{project.title}</h3>

            {/* Edit Icon */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                <FiEdit2
                    className="text-[var(--accent-500)] cursor-pointer hover:text-[var(--accent-600)]"
                    size={20}
                    onClick={(e) => {
                        e.stopPropagation(); // prevent triggering the card click
                        onEdit(project);
                    }}
                />
            </div>
        </div>
    );
}
