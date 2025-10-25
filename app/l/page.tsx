"use client";

import LoadingComponent from "../components/loading";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { acceptInvitation, getTitleByToken } from "../views/invite";

const AcceptInvitePageContent = () => {
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    useEffect(() => {
        document.title = "Accepting Invite - coi";
    }, []);

    useEffect(() => {
        const fetchInviteDetails = async () => {
            if (!token) {
                setError("No token provided");
                return;
            }

            try {
                const { title: inviteTitle } = await getTitleByToken(token);
                setTitle(inviteTitle);
            } catch (err) {
                console.error("Error fetching invite details:", err);
                setError("Failed to load invitation details. It may be invalid or expired.");
            }
        };

        fetchInviteDetails();
    }, [token]);

    const handleAcceptInvite = async () => {
        if (!token) return;

        setIsAccepting(true);
        try {
            // Accept the invitation
            await acceptInvitation(token);

            // Get type again to redirect
            const { type } = await getTitleByToken(token);

            // Redirect based on type
            if (type === 'project') {
                window.location.href = "/dashboard";
            } else if (type === 'course') {
                window.location.href = "/courses";
            }
        } catch (err) {
            console.error("Error accepting invite:", err);
            setError("Failed to accept invitation. It may be invalid or expired.");
        } finally {
            setIsAccepting(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl mb-4">{error}</p>
                    <a href="/dashboard" className="text-[var(--accent-500)] hover:underline">Go to Dashboard</a>
                </div>
            </div>
        );
    }

    if (!title) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 flex items-center justify-center">
                <div className="text-center">
                    <LoadingComponent small={false} />
                    <p className="mt-4">Loading invitation...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 flex items-center justify-center">
            <div className="text-center bg-[var(--neutral-100)] p-8 rounded-lg shadow-lg max-w-md">
                <p className="text-[var(--foreground)] text-xl mb-4">You were invited to join</p>
                <h1 className="text-3xl font-bold text-[var(--accent-500)] mb-8">{title}</h1>
                <button
                    onClick={handleAcceptInvite}
                    disabled={isAccepting}
                    className={`px-6 py-3 rounded-md font-semibold text-white ${
                        isAccepting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-[var(--accent-500)] hover:bg-[var(--accent-600)]'
                    }`}
                >
                    {isAccepting ? 'Accepting...' : 'Accept Invitation'}
                </button>
            </div>
        </div>
    );
};

const AcceptInvitePage = () => {
    return (
        <Suspense fallback={<LoadingComponent small={false} />}>
            <AcceptInvitePageContent />
        </Suspense>
    );
};

export default AcceptInvitePage;