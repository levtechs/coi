"use client";

import { useState, useEffect } from "react";
import { FiUser, FiCopy, FiUserPlus, FiLink, FiMail, FiLoader, FiCheck } from "react-icons/fi";
import { FaCrown } from "react-icons/fa";

import Button from "@/app/components/button";
import { Project, User } from "@/lib/types";
import { getUserFromId } from "@/app/views/users";
import { createInvitation } from "@/app/views/invite";
import { getFriendships, FriendshipResponse } from "@/app/views/friends";
import { addCollaboratorByUserId } from "@/app/views/projects";
import { auth } from "@/lib/firebase";

interface SharePanelProps {
    project: Project;
    user: { uid: string } | null;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
}

export default function SharePanel({ project, user, addCollaborator }: SharePanelProps) {
    // Collaborators state
    const [collaborators, setCollaborators] = useState<User[]>([]);
    const [loadingCollabs, setLoadingCollabs] = useState(true);

    // Friends state
    const [friends, setFriends] = useState<FriendshipResponse[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
    const [addedFriendIds, setAddedFriendIds] = useState<Set<string>>(new Set());

    // Email add state
    const [email, setEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailSuccess, setEmailSuccess] = useState(false);

    // Invite link state
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isOwner = user?.uid === project.ownerId;
    const currentUserEmail = auth.currentUser?.email ?? "";

    // Fetch collaborators
    useEffect(() => {
        const fetchCollaborators = async () => {
            setLoadingCollabs(true);
            try {
                const userIds = [project.ownerId, ...(project.sharedWith || [])];
                const uniqueIds = [...new Set(userIds)];
                const users = await Promise.all(uniqueIds.map(id => getUserFromId(id)));
                setCollaborators(users.filter((u): u is User => u !== null));
            } catch (err) {
                console.error("Failed to fetch collaborators:", err);
            } finally {
                setLoadingCollabs(false);
            }
        };
        fetchCollaborators();
    }, [project.ownerId, project.sharedWith]);

    // Fetch friends
    useEffect(() => {
        const fetchFriends = async () => {
            setLoadingFriends(true);
            try {
                const accepted = await getFriendships("accepted");
                setFriends(accepted);
            } catch (err) {
                console.error("Failed to fetch friends:", err);
            } finally {
                setLoadingFriends(false);
            }
        };
        fetchFriends();
    }, []);

    // Determine which friends are already collaborators
    const sharedSet = new Set([project.ownerId, ...(project.sharedWith || [])]);

    const handleAddFriend = async (friendId: string) => {
        setAddingFriendId(friendId);
        try {
            await addCollaboratorByUserId(project.id, friendId);
            setAddedFriendIds(prev => new Set(prev).add(friendId));
        } catch (err) {
            console.error("Failed to add friend:", err);
        } finally {
            setAddingFriendId(null);
        }
    };

    const handleAddByEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setEmailLoading(true);
        setEmailError(null);
        setEmailSuccess(false);
        try {
            await addCollaborator(project.id, email.trim());
            setEmailSuccess(true);
            setEmail("");
            setTimeout(() => setEmailSuccess(false), 2000);
        } catch (err) {
            console.error("Failed to add collaborator:", err);
            setEmailError("Failed to add collaborator. Check the email and try again.");
        } finally {
            setEmailLoading(false);
        }
    };

    const handleCreateInvite = async () => {
        setInviteLoading(true);
        setInviteError(null);
        try {
            const result = await createInvitation(project.id);
            setInviteUrl(`${window.location.origin}/i?token=${result.token}`);
        } catch (err) {
            console.error("Failed to create invitation:", err);
            setInviteError("Failed to create invitation. Please try again.");
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCopy = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="w-full max-w-lg flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
            
            {/* Section: Invite Link */}
            <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                    <FiLink size={16} /> Invite Link
                </h3>
                {inviteUrl ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={inviteUrl}
                            readOnly
                            className="flex-1 border rounded-md px-3 py-2 text-sm"
                            style={{
                                borderColor: "var(--neutral-300)",
                                backgroundColor: "var(--neutral-100)",
                                color: "var(--foreground)",
                            }}
                        />
                        <Button
                            color="var(--accent-500)"
                            onClick={handleCopy}
                        >
                            {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
                            Create a link to invite anyone to this project.
                        </p>
                        {inviteError && (
                            <p className="text-xs" style={{ color: "var(--error)" }}>{inviteError}</p>
                        )}
                        <Button
                            onClick={handleCreateInvite}
                            color="var(--accent-500)"
                            disabled={inviteLoading}
                            className="w-full"
                        >
                            {inviteLoading ? <FiLoader className="animate-spin mx-auto" size={16} /> : "Create Invite Link"}
                        </Button>
                    </div>
                )}
            </div>

            {/* Section: Add Friends */}
            <div className="pt-4 border-t" style={{ borderColor: "var(--neutral-300)" }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                    <FiUserPlus size={16} /> Add Friends
                </h3>
                {loadingFriends ? (
                    <div className="flex justify-center py-4">
                        <FiLoader className="animate-spin w-5 h-5" style={{ color: "var(--foreground)" }} />
                    </div>
                ) : friends.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--neutral-500)" }}>
                        No friends yet. <a href="/friends" className="underline" style={{ color: "var(--accent-500)" }}>Find friends</a>
                    </p>
                ) : (
                    <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        {friends.map(f => {
                            const alreadyAdded = sharedSet.has(f.friend.id) || addedFriendIds.has(f.friend.id);
                            const isAdding = addingFriendId === f.friend.id;

                            return (
                                <li
                                    key={f.friend.id}
                                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-[var(--neutral-200)]"
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: "var(--accent-500)" }}
                                    >
                                        <FiUser className="text-white" size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                                            {f.friend.displayName}
                                        </span>
                                        <p className="text-xs truncate" style={{ color: "var(--neutral-600)" }}>
                                            {f.friend.email}
                                        </p>
                                    </div>
                                    {alreadyAdded ? (
                                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ color: "var(--success)" }}>
                                            <FiCheck size={12} /> Added
                                        </span>
                                    ) : (
                                        <Button
                                            color="var(--accent-500)"
                                            onClick={() => handleAddFriend(f.friend.id)}
                                            disabled={isAdding}
                                        >
                                            {isAdding ? <FiLoader className="animate-spin" size={14} /> : "Add"}
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Section: Collaborators */}
            <div className="pt-4 border-t" style={{ borderColor: "var(--neutral-300)" }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                    <FiUser size={16} /> Collaborators
                </h3>
                {loadingCollabs ? (
                    <div className="flex justify-center py-4">
                        <FiLoader className="animate-spin w-5 h-5" style={{ color: "var(--foreground)" }} />
                    </div>
                ) : (
                    <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto mb-4">
                        {collaborators.map(collab => (
                            <li
                                key={collab.id}
                                className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-[var(--neutral-200)]"
                                onClick={() => window.open(`/profile/user/${collab.id}`, "_blank")}
                            >
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: "var(--accent-500)" }}
                                >
                                    <FiUser className="text-white" size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                                            {collab.displayName}
                                        </span>
                                        {collab.id === project.ownerId && (
                                            <FaCrown size={12} style={{ color: "var(--accent-500)" }} title="Owner" />
                                        )}
                                        {collab.email.toLowerCase() === currentUserEmail.toLowerCase() && (
                                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--neutral-300)", color: "var(--foreground)" }}>
                                                you
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs truncate" style={{ color: "var(--neutral-600)" }}>
                                        {collab.email}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Add by email — owner only */}
                {isOwner && (
                    <div className="bg-[var(--neutral-200)] p-4 rounded-md">
                        <p className="text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
                            <FiMail className="inline mr-1.5" size={14} /> Add by email
                        </p>
                        <form onSubmit={handleAddByEmail} className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Enter email address"
                                className="flex-1 border rounded-md px-3 py-2 text-sm"
                                style={{
                                    borderColor: "var(--neutral-300)",
                                    backgroundColor: "var(--neutral-100)",
                                    color: "var(--foreground)",
                                }}
                            />
                            <Button
                                color="var(--accent-500)"
                                onClick={() => {}}
                                type="submit"
                                disabled={emailLoading || !email.trim()}
                            >
                                {emailLoading ? <FiLoader className="animate-spin" size={16} /> : "Add"}
                            </Button>
                        </form>
                        {emailError && (
                            <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{emailError}</p>
                        )}
                        {emailSuccess && (
                            <p className="text-xs mt-1" style={{ color: "var(--success)" }}>Collaborator added!</p>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}