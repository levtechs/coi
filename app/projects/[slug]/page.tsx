"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Project } from "@/lib/types";
import { addCollaborator, setTitle, getProject } from "@/app/views/projects"

import Button from "@/app/components/button";
import Editor from "@/app/components/editor/editor";
import LoadingComponent from "@/app/components/loading";

export default function ProjectPage() {
    const [isLoading, setLoading] = useState<boolean | "error">(true);

    const { user } = useAuth();
    const params = useParams();

    const slugParam = params?.slug;
    const projectId = Array.isArray(slugParam) ? slugParam[0] : slugParam;

    const [project, setProject] = useState<Project | null>(null);

    useEffect(() => {
        setLoading(true);
        if (!user) return;

        const slugParam = params?.slug;
        const projectId = Array.isArray(slugParam) ? slugParam[0] : slugParam;
        if (!projectId) return;

        async function fetchProject() {
            try {
                const project = await getProject(projectId!);
                setProject(project);
                setLoading(false);
            }
            catch (err) {
                console.error("Failed to fetch project:", err);
                setLoading("error");
            }
        }

        fetchProject();
    }, [user, params?.slug]);

    if (!projectId) return; // early return if undefined

    if (isLoading === "error") {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
                <img src="/error.png" alt="Not Found" className="w-64 h-64 mb-8" />
                <p className="text-2xl font-semibold mb-4">Error loading project.</p>
                <p className="text-lg mb-6">Please check the project ID or try again later.</p>
                <Button color="var(--accent-500)" onClick={() => (window.location.href = "/dashboard")}>
                    Go to Dashboard
                </Button>
            </div>
        );
    }

    if (isLoading || !project) {
        return (
            <LoadingComponent loadingText="Loading project" />
        );
    }

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

    return (
        <Editor 
            project={project} 
            user={user} 
            setProject={setProject} 
            addCollaborator={addCollaborator}
            setTitle={setTitle}
        />
    );
}
