"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { initializeApp, getApps, getApp } from "firebase/app";

import { getProjectTitleByToken, acceptInvitation } from "@/app/views/invite";
import Button from "@/app/components/button";
import Error from "../components/error";

// These variables are provided by the hosting environment
declare const __firebase_config: string;

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Check if a Firebase app is already initialized before creating a new one
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

function InvitePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [projectTitle, setProjectTitle] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [inputToken, setInputToken] = useState<string>("");

    // Auth state listener and initial login
    useEffect(() => {
        const urlToken = searchParams.get("token");
        if (urlToken) {
            setToken(urlToken);
            fetchProjectTitle(urlToken);
        } else {
            setIsLoading(false);
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                // If there is no signed-in user, redirect to the login page.
                // This is a more direct approach for a page that requires authentication.
                const forwardUrl = `/i${urlToken ? `?token=${urlToken}` : ""}`;
                router.push(`/login?forward=${encodeURIComponent(forwardUrl)}`);
            }
        });
        
        return () => unsubscribe();
    }, [searchParams, router]);

    const fetchProjectTitle = async (tkn: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getProjectTitleByToken(tkn);
            setProjectTitle(data.title);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!user) {
            // This case should ideally not be reached due to the auth listener redirect.
            router.push("/login?signup=true");
            return;
        }

        if (!token) {
            setError("No token provided to accept.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await acceptInvitation(token);
            // TODO: The acceptInvitation route should return the projectId to redirect to
            // For now, we'll navigate to the dashboard.
            router.push("/dashboard");
        } catch (err) {
            setError((err as Error).message);
            setIsLoading(false);
        }
    };

    const handleSubmitToken = () => {
        if (inputToken.trim()) {
            router.push(`/i?token=${inputToken.trim()}`);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold">Loading...</div>;
    }

    if (token) {
        // Render after a token is found
        return (
            <>
                {error ? (<Error h2="Could not accept invite" p={error}/>) : (
                    <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--neutral-100)] rounded-lg shadow-lg">
                        <div className="text-center">

                            <p className="text-[var(--foreground)] text-xl mb-4">You were invited to the project</p>
                            <h1 className="text-4xl font-bold text-[var(--accent-500)] mb-8">{projectTitle}</h1>
                            <Button
                                color="var(--accent-500)"
                                onClick={handleAccept}
                            >
                                Accept Invitation
                            </Button>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Render for initial state with no token
    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--neutral-100)] rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Enter Invitation Token</h1>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    placeholder="e.g., 123456"
                    className="p-2 rounded-md border border-[var(--neutral-300)]"
                />
                <Button
                    onClick={handleSubmitToken}
                    color="var(--accent-500)"
                >
                    Submit
                </Button>
            </div>
        </div>
    );
}

export default function InvitePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InvitePageContent />
        </Suspense>
    )
}
