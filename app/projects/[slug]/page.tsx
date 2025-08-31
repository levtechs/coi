"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Project, getName, getContent, getCollaborators } from "@/lib/projects";

import Button from "@/app/components/button";

export default function ProjectPage() {
    const { user } = useAuth();
    const params = useParams();

    const slugParam = params?.slug;
    const projectId = Array.isArray(slugParam) ? slugParam[0] : slugParam;
    if (!projectId) return; // early return if undefined

    const [project, setProject] = useState<Project | null>(null);

    useEffect(() => {
        if (!user) return;

        const slugParam = params?.slug;
        const projectId = Array.isArray(slugParam) ? slugParam[0] : slugParam;
        if (!projectId) return;

        async function fetchProject() {
            const name = await getName(user!.uid, projectId!);
            const collaborators = await getCollaborators(user!.uid, projectId!);
            const content = await getContent(user!.uid, projectId!);
            setProject({
                id: projectId!,
                name: name, // default to ID if name not fetched
                collaborators,
                content,
            });
        }

        fetchProject();
    }, [user, params?.slug]);


    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
                <p className="text-2xl font-semibold mb-4">You are not logged in.</p>
                <p className="text-lg mb-6">Please log in to access this project.</p>
                <Button color="var(--accent-500)" onClick={() => (window.location.href = "/login")}>
                    Go to Login Page
                </Button>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-[var(--foreground)] text-xl">Loading project...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto bg-[var(--neutral-100)] rounded-lg shadow-lg">
            <h1 className="text-[var(--foreground)] text-3xl font-bold mb-4">{project.name}</h1>
            <p className="text-[var(--foreground)] mb-2"><strong>ID:</strong> {project.id}</p>
            <p className="text-[var(--foreground)] mb-2">
                <strong>Collaborators:</strong> {project.collaborators.join(", ") || "None"}
            </p>
            <div className="mt-4">
                <h2 className="text-[var(--foreground)] text-xl font-semibold mb-2">Content:</h2>
                <div className="p-3 bg-[var(--neutral-200)] rounded-md text-[var(--foreground)] whitespace-pre-wrap">
                    {project.content || "(No content)"}
                </div>
            </div>
        </div>
    );
}
