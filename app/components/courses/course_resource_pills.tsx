"use client";

import { FileText, Globe, Image as ImageIcon, Paperclip, Play } from "lucide-react";
import { CourseResource } from "@/lib/types/course";

export function visibleStudentResources(resources?: CourseResource[]): CourseResource[] {
    return (resources || []).filter((r) => r.studentVisible !== false);
}

function resourcePillIcon(resource: CourseResource) {
    const url = resource.url.toLowerCase();
    const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");

    if (resource.kind === "video" || (resource.kind === "link" && isYoutube)) {
        return <Play className="w-3 h-3 shrink-0 fill-current" />;
    }
    if (resource.kind === "link") {
        return <Globe className="w-3 h-3 shrink-0" />;
    }
    if (resource.kind === "pdf" || resource.kind === "markdown") {
        return <FileText className="w-3 h-3 shrink-0" />;
    }
    if (resource.kind === "image") {
        return <ImageIcon className="w-3 h-3 shrink-0" />;
    }
    return <Paperclip className="w-3 h-3 shrink-0" />;
}

function resourceKey(resource: CourseResource, index: number): string {
    if (resource.id) return resource.id;
    return `${resource.url}-${resource.title}-${index}`;
}

const pillClassName =
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[var(--neutral-200)] text-[var(--neutral-700)] border border-[var(--neutral-300)] transition-colors hover:bg-[var(--neutral-300)] max-w-full";

interface CourseResourcePillsProps {
    resources: CourseResource[];
    /** Shown as aria-label / title hint for the group */
    groupLabel?: string;
}

export default function CourseResourcePills({ resources, groupLabel = "Open resource" }: CourseResourcePillsProps) {
    if (resources.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2" role="list" aria-label={groupLabel}>
            {resources.map((resource, index) => {
                const titleAttr = [resource.caption, resource.sourceFileName].filter(Boolean).join(" — ") || undefined;
                const label = resource.title || resource.url;
                return (
                    <a
                        key={resourceKey(resource, index)}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="listitem"
                        title={titleAttr}
                        className={pillClassName}
                    >
                        <span className="shrink-0 text-[var(--neutral-500)]">{resourcePillIcon(resource)}</span>
                        <span className="truncate text-[11px] max-w-[200px] sm:max-w-[260px]">{label}</span>
                    </a>
                );
            })}
        </div>
    );
}
