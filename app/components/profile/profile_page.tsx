"use client"

import { useState, useEffect, useCallback } from "react";

import Link from "next/link";
import { FiHome, FiStar, FiUser, FiUsers, FiActivity, FiFolder, FiUserPlus, FiUserCheck, FiClock, FiUserX } from "react-icons/fi";

import LoadingComponent from "../loading";
import Error from "../error";

import { User } from "@/lib/types";
import { getUserFromId } from "@/app/views/users";
import { useAuth } from "@/lib/AuthContext";
import { getFriendships, sendFriendRequest, removeFriend, FriendshipResponse } from "@/app/views/friends";

interface ProfilePageProps {
    userId: string;
}

const ProfilePage = ({ userId }: ProfilePageProps) => {
    const { user: authUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Friend state
    const [friendStatus, setFriendStatus] = useState<"none" | "pending_sent" | "pending_received" | "accepted">("none");
    const [friendshipData, setFriendshipData] = useState<FriendshipResponse | null>(null);
    const [friendLoading, setFriendLoading] = useState(false);

    const isOwnProfile = authUser?.uid === userId;

    useEffect(() => {
        const fetchUser = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const fetched = await getUserFromId(userId);
                if (!fetched) {
                    setError("User not found");
                    setUser(null);
                } else {
                    setUser(fetched);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch user");
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [userId]);

    const fetchFriendStatus = useCallback(async () => {
        if (isOwnProfile || !authUser) return;
        try {
            const all = await getFriendships("all");
            const match = all.find((f) => f.friend.id === userId);
            if (!match) {
                setFriendStatus("none");
                setFriendshipData(null);
            } else if (match.status === "accepted") {
                setFriendStatus("accepted");
                setFriendshipData(match);
            } else if (match.requesterId === authUser.uid) {
                setFriendStatus("pending_sent");
                setFriendshipData(match);
            } else {
                setFriendStatus("pending_received");
                setFriendshipData(match);
            }
        } catch (err) {
            console.error("Failed to fetch friend status", err);
        }
    }, [isOwnProfile, authUser, userId]);

    useEffect(() => {
        fetchFriendStatus();
    }, [fetchFriendStatus]);

    const handleAddFriend = async () => {
        setFriendLoading(true);
        try {
            await sendFriendRequest(userId);
            await fetchFriendStatus();
        } catch (err) {
            console.error("Failed to send friend request", err);
        } finally {
            setFriendLoading(false);
        }
    };

    const handleRemoveFriend = async () => {
        if (!friendshipData) return;
        setFriendLoading(true);
        try {
            await removeFriend(friendshipData.id);
            setFriendStatus("none");
            setFriendshipData(null);
        } catch (err) {
            console.error("Failed to remove friend", err);
        } finally {
            setFriendLoading(false);
        }
    };

    if (isLoading) return <LoadingComponent loadingText="Loading profile" />;
    if (error) return <Error h2={error} p="Please try again later" />;
    if (!user) return <Error h2="No user found" p="Please try again later" />;

    return (
        <div className="max-w-md mx-auto mt-8 p-6 rounded-xl shadow-md"
            style={{ backgroundColor: "var(--neutral-100)" }}>
            {/* Header row */}
            <div className="flex justify-between items-center">
                <Link href="/dashboard">
                    <FiHome
                        size={32}
                        className="cursor-pointer"
                        style={{ color: "var(--accent-500)" }}
                    />
                </Link>
                <div className="flex items-center gap-2">
                    {user.starUser && (
                        <FiStar size={32} style={{ color: "var(--warning)" }} />
                    )}
                </div>
            </div>

            <hr className="mt-4 mb-4" style={{ borderColor: "var(--neutral-200)", borderWidth: "2px" }} />

            {/* Avatar + Name */}
            <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--accent-500)" }}>
                    <FiUser size={28} style={{ color: "var(--neutral-100)" }} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">{user.displayName}</h2>
                    <p className="text-sm" style={{ color: "var(--neutral-600)" }}>{user.email}</p>
                </div>
            </div>

            {/* Friend button (only on other users' profiles) */}
            {!isOwnProfile && authUser && (
                <div className="mt-4">
                    {friendStatus === "none" && (
                        <button
                            onClick={handleAddFriend}
                            disabled={friendLoading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity"
                            style={{
                                backgroundColor: "var(--accent-500)",
                                color: "var(--neutral-100)",
                                opacity: friendLoading ? 0.6 : 1,
                            }}
                        >
                            <FiUserPlus size={16} />
                            {friendLoading ? "Sending..." : "Add Friend"}
                        </button>
                    )}
                    {friendStatus === "pending_sent" && (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: "var(--neutral-200)", color: "var(--neutral-600)" }}>
                                <FiClock size={16} />
                                Request Sent
                            </span>
                            <button
                                onClick={handleRemoveFriend}
                                disabled={friendLoading}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-opacity"
                                style={{
                                    backgroundColor: "var(--neutral-200)",
                                    color: "var(--error)",
                                    opacity: friendLoading ? 0.6 : 1,
                                }}
                            >
                                <FiUserX size={16} />
                                Cancel
                            </button>
                        </div>
                    )}
                    {friendStatus === "pending_received" && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={async () => {
                                    if (!friendshipData) return;
                                    setFriendLoading(true);
                                    try {
                                        const { acceptFriendRequest } = await import("@/app/views/friends");
                                        await acceptFriendRequest(friendshipData.id);
                                        await fetchFriendStatus();
                                    } catch (err) {
                                        console.error("Failed to accept friend request", err);
                                    } finally {
                                        setFriendLoading(false);
                                    }
                                }}
                                disabled={friendLoading}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity"
                                style={{
                                    backgroundColor: "var(--success)",
                                    color: "var(--neutral-100)",
                                    opacity: friendLoading ? 0.6 : 1,
                                }}
                            >
                                <FiUserCheck size={16} />
                                {friendLoading ? "Accepting..." : "Accept Request"}
                            </button>
                            <button
                                onClick={handleRemoveFriend}
                                disabled={friendLoading}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-opacity"
                                style={{
                                    backgroundColor: "var(--neutral-200)",
                                    color: "var(--error)",
                                    opacity: friendLoading ? 0.6 : 1,
                                }}
                            >
                                <FiUserX size={16} />
                                Decline
                            </button>
                        </div>
                    )}
                    {friendStatus === "accepted" && (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: "var(--success)", color: "var(--neutral-100)" }}>
                                <FiUserCheck size={16} />
                                Friends
                            </span>
                            <button
                                onClick={handleRemoveFriend}
                                disabled={friendLoading}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-opacity"
                                style={{
                                    backgroundColor: "var(--neutral-200)",
                                    color: "var(--error)",
                                    opacity: friendLoading ? 0.6 : 1,
                                }}
                            >
                                <FiUserX size={16} />
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            )}

            <hr className="mt-4 mb-4" style={{ borderColor: "var(--neutral-200)", borderWidth: "1px" }} />

            {/* Stats */}
            <div className="mt-2">
                <h3 className="text-lg font-semibold mb-3">Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center p-3 rounded-lg"
                        style={{ backgroundColor: "var(--neutral-200)" }}>
                        <FiFolder size={20} style={{ color: "var(--accent-500)" }} />
                        <span className="text-xl font-bold mt-1">{user.projectIds?.length ?? 0}</span>
                        <span className="text-xs" style={{ color: "var(--neutral-600)" }}>Projects</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-lg"
                        style={{ backgroundColor: "var(--neutral-200)" }}>
                        <FiActivity size={20} style={{ color: "var(--accent-500)" }} />
                        <span className="text-xl font-bold mt-1">{user.actions ?? 0}</span>
                        <span className="text-xs" style={{ color: "var(--neutral-600)" }}>Actions</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-lg"
                        style={{ backgroundColor: "var(--neutral-200)" }}>
                        <FiUsers size={20} style={{ color: "var(--accent-500)" }} />
                        <span className="text-xl font-bold mt-1">{user.friendIds?.length ?? 0}</span>
                        <span className="text-xs" style={{ color: "var(--neutral-600)" }}>Friends</span>
                    </div>
                </div>
            </div>

            {/* Badges placeholder */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Badges</h3>
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm italic" style={{ color: "var(--neutral-500)" }}>No badges yet</span>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
