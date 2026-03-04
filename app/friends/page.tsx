"use client";

import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState } from "react";
import Sidebar from "@/app/components/sidebar";
import { FlickeringGrid } from "@/app/components/flickering-grid";
import LoginPrompt from "@/app/components/login_prompt";
import LoadingComponent from "@/app/components/loading";
import FriendsList from "@/app/components/friends/friends_list";
import Leaderboard from "@/app/components/friends/leaderboard";
import { FiLink } from "react-icons/fi";
import { createFriendInvitation } from "@/app/views/invite";

export default function FriendsPage() {
    const { user: firebaseUser, loading: authLoading } = useAuth();
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [creatingLink, setCreatingLink] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        document.title = "Friends - coi";
    }, []);

    const handleCreateInviteLink = async () => {
        setCreatingLink(true);
        try {
            const result = await createFriendInvitation();
            const url = `${window.location.origin}/i?token=${result.token}`;
            setInviteUrl(url);
        } catch (err) {
            console.error("Failed to create friend invite link:", err);
        } finally {
            setCreatingLink(false);
        }
    };

    const handleCopy = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <LoadingComponent />
            </div>
        );
    }

    if (!firebaseUser) {
        return <LoginPrompt page="friends" />;
    }

    return (
        <div className="min-h-screen text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none" />
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <Sidebar current="friends" />
            <div className="ml-16 p-6 relative z-5 flex justify-center">
                <div className="w-full max-w-5xl">
                    <div className="mb-8 text-center sm:text-left">
                        <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-2">
                            Friends
                        </h1>
                        <p className="text-[var(--neutral-500)] text-sm">
                            Add friends and collaborate on projects together.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column: Invite & Leaderboard */}
                        <div className="flex flex-col gap-6 md:col-span-1">
                            {/* Invite Link Section */}
                            <div className="p-5 rounded-xl bg-[var(--neutral-200)] shadow-sm border border-[var(--neutral-300)]">
                                <p className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                                    <FiLink size={16} className="text-[var(--accent-500)]" />
                                    Invite a friend
                                </p>
                                {!inviteUrl ? (
                                    <button
                                        onClick={handleCreateInviteLink}
                                        disabled={creatingLink}
                                        className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors hover:brightness-90 disabled:opacity-50"
                                        style={{ backgroundColor: "var(--accent-500)" }}
                                    >
                                        {creatingLink ? "Creating..." : "Create Invite Link"}
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="text"
                                            value={inviteUrl}
                                            readOnly
                                            className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--neutral-100)] text-[var(--foreground)] border border-[var(--neutral-300)] outline-none"
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className="w-full px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:brightness-90"
                                            style={{ backgroundColor: "var(--accent-500)" }}
                                        >
                                            {copied ? "Copied!" : "Copy"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Leaderboard */}
                            <div className="rounded-xl overflow-hidden shadow-sm border border-[var(--neutral-300)] bg-[var(--neutral-200)]">
                                <Leaderboard />
                            </div>
                        </div>

                        {/* Right Column: Friends List */}
                        <div className="md:col-span-2">
                            <div className="p-5 rounded-xl bg-[var(--neutral-200)] shadow-sm border border-[var(--neutral-300)] h-full">
                                <FriendsList currentUserId={firebaseUser.uid} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
