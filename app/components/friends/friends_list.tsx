"use client";

import { useState, useEffect, useCallback } from "react";
import {
    getFriendships,
    acceptFriendRequest,
    removeFriend,
    FriendshipResponse,
} from "@/app/views/friends";
import FriendCard from "./friend_card";
import { FiUsers, FiUserPlus, FiClock } from "react-icons/fi";

interface FriendsListProps {
    currentUserId: string;
}

type Tab = "friends" | "incoming" | "outgoing";

export default function FriendsList({ currentUserId }: FriendsListProps) {
    const [friendships, setFriendships] = useState<FriendshipResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("friends");

    const fetchFriendships = useCallback(async () => {
        try {
            const data = await getFriendships("all");
            setFriendships(data);
        } catch (err) {
            console.error("Failed to fetch friendships:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFriendships();
    }, [fetchFriendships]);

    const handleAccept = async (id: string) => {
        try {
            await acceptFriendRequest(id);
            // Optimistic update: move from pending to accepted
            setFriendships((prev) =>
                prev.map((f) =>
                    f.id === id ? { ...f, status: "accepted" as const, acceptedAt: new Date().toISOString() } : f
                )
            );
        } catch (err) {
            console.error("Failed to accept friend request:", err);
            await fetchFriendships(); // Revert on error
        }
    };

    const handleDecline = async (id: string) => {
        try {
            // Optimistic update: remove from list
            setFriendships((prev) => prev.filter((f) => f.id !== id));
            await removeFriend(id);
        } catch (err) {
            console.error("Failed to decline friend request:", err);
            await fetchFriendships(); // Revert on error
        }
    };

    const handleRemove = async (id: string) => {
        try {
            // Optimistic update: remove from list
            setFriendships((prev) => prev.filter((f) => f.id !== id));
            await removeFriend(id);
        } catch (err) {
            console.error("Failed to remove friend:", err);
            await fetchFriendships(); // Revert on error
        }
    };

    const accepted = friendships.filter((f) => f.status === "accepted");
    const incoming = friendships.filter(
        (f) => f.status === "pending" && f.requesterId !== currentUserId
    );
    const outgoing = friendships.filter(
        (f) => f.status === "pending" && f.requesterId === currentUserId
    );

    const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
        { key: "friends", label: "Friends", icon: <FiUsers size={16} />, count: accepted.length },
        { key: "incoming", label: "Requests", icon: <FiUserPlus size={16} />, count: incoming.length },
        { key: "outgoing", label: "Sent", icon: <FiClock size={16} />, count: outgoing.length },
    ];

    const currentList =
        tab === "friends" ? accepted : tab === "incoming" ? incoming : outgoing;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[var(--neutral-400)] border-t-[var(--accent-500)] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-lg bg-[var(--neutral-300)]">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                            tab === t.key
                                ? "bg-[var(--neutral-100)] text-[var(--foreground)]"
                                : "text-[var(--neutral-500)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        {t.icon}
                        {t.label}
                        {t.count > 0 && (
                            <span
                                className="ml-1 px-1.5 py-0.5 text-xs rounded-full text-white"
                                style={{
                                    backgroundColor:
                                        t.key === "incoming"
                                            ? "var(--accent-500)"
                                            : "var(--neutral-500)",
                                }}
                            >
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex flex-col gap-2">
                {currentList.length === 0 && (
                    <p className="text-center text-[var(--neutral-500)] py-8 text-sm">
                        {tab === "friends" && "No friends yet. Send a friend request to get started!"}
                        {tab === "incoming" && "No pending friend requests."}
                        {tab === "outgoing" && "No outgoing requests."}
                    </p>
                )}
                {currentList.map((f) => (
                    <FriendCard
                        key={f.id}
                        friendship={f}
                        currentUserId={currentUserId}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                        onRemove={handleRemove}
                    />
                ))}
            </div>
        </div>
    );
}
