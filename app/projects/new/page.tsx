"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Project, ChatPreferences, ChatAttachment } from "@/lib/types";
import { addCollaborator, setTitle } from "@/app/views/projects";

import Editor from "@/app/components/editor/editor";
import LoadingComponent from "@/app/components/loading";
import Button from "@/app/components/button";
import MaintenencePage from "@/app/components/maintenence";

interface QuickCreateData {
    message: string;
    attachments: ChatAttachment[] | null;
    preferences: ChatPreferences;
}

export default function QuickCreateProjectPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [quickCreateData, setQuickCreateData] = useState<QuickCreateData | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const dataLoadedRef = useRef(false);

    useEffect(() => {
        document.title = "New Project - coi";
    }, []);

    // Load quick create data from sessionStorage on mount
    useEffect(() => {
        if (dataLoadedRef.current) return;
        dataLoadedRef.current = true;

        try {
            const stored = sessionStorage.getItem("quickCreateData");
            if (stored) {
                const parsed = JSON.parse(stored) as QuickCreateData;
                setQuickCreateData(parsed);
                // Clear sessionStorage after reading
                sessionStorage.removeItem("quickCreateData");
            }
        } catch (err) {
            console.error("Failed to parse quick create data:", err);
        }
        setDataLoaded(true);
    }, []);

    // Redirect to dashboard if no quick create data
    useEffect(() => {
        if (dataLoaded && !quickCreateData) {
            router.replace("/dashboard");
        }
    }, [dataLoaded, quickCreateData, router]);

    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
        return (<MaintenencePage />);
    }

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <LoadingComponent />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
                <p className="text-2xl font-semibold mb-4">You are not logged in.</p>
                <p className="text-lg mb-6">Please log in to access this feature.</p>
                <Button color="var(--accent-500)" onClick={() => (window.location.href = "/login")}>
                    Go to Login Page
                </Button>
            </div>
        );
    }

    if (!dataLoaded || !quickCreateData) {
        return <LoadingComponent loadingText="Preparing project" />;
    }

    // Create a synthetic empty project for the editor
    const emptyProject: Project = {
        id: "new",
        title: quickCreateData.message.substring(0, 50) + (quickCreateData.message.length > 50 ? "..." : ""),
        ownerId: user.uid,
        collaborators: [],
        sharedWith: [],
        cards: [],
        hierarchy: { title: "", children: [] },
        uploads: [],
    };

    return (
        <Editor
            project={emptyProject}
            user={user}
            addCollaborator={async () => { console.warn("Cannot add collaborators during creation"); }}
            setTitle={async () => { console.warn("Cannot set title during creation"); }}
            setProject={() => {}} // No-op since this is a temporary project
            quickCreate={{
                message: quickCreateData.message,
                attachments: quickCreateData.attachments,
                preferences: quickCreateData.preferences,
                onProjectCreated: (projectId: string) => {
                    router.replace(`/projects/${projectId}`);
                },
            }}
        />
    );
}
