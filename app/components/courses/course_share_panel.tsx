"use client";

import { useState, useEffect } from "react";
import { FiUser, FiCopy, FiUserPlus, FiLink, FiLoader, FiCheck } from "react-icons/fi";
import { FaCrown } from "react-icons/fa";

import Button from "@/app/components/button";
import { Course, User } from "@/lib/types";
import { getUserFromId } from "@/app/views/users";
import { createCourseInvitation } from "@/app/views/invite";
import { getFriendships, FriendshipResponse } from "@/app/views/friends";
import { addCourseCollaboratorByUserId } from "@/app/views/courses";
import { auth } from "@/lib/firebase";

interface CourseSharePanelProps {
    course: Course;
    courseId: string;
    isOwner: boolean | null;
}

export default function CourseSharePanel({ course, courseId, isOwner }: CourseSharePanelProps) {
    // Members state
    const [members, setMembers] = useState<User[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    // Friends state
    const [friends, setFriends] = useState<FriendshipResponse[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
    const [addedFriendIds, setAddedFriendIds] = useState<Set<string>>(new Set());

    // Invite link state
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const currentUserEmail = auth.currentUser?.email ?? "";

    // Fetch members
    useEffect(() => {
        const fetchMembers = async () => {
            setLoadingMembers(true);
            try {
                const userIds = [course.ownerId, ...(course.sharedWith || [])].filter((id): id is string => !!id);
                const uniqueIds = [...new Set(userIds)];
                const users = await Promise.all(uniqueIds.map(id => getUserFromId(id)));
                setMembers(users.filter((u): u is User => u !== null));
            } catch (err) {
                console.error("Failed to fetch members:", err);
            } finally {
                setLoadingMembers(false);
            }
        };
        fetchMembers();
    }, [course.ownerId, course.sharedWith]);

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

    const sharedSet = new Set([course.ownerId, ...(course.sharedWith || [])].filter(Boolean));

    const handleAddFriend = async (friendId: string) => {
        setAddingFriendId(friendId);
        try {
            await addCourseCollaboratorByUserId(courseId, friendId);
            setAddedFriendIds(prev => new Set(prev).add(friendId));
        } catch (err) {
            console.error("Failed to add friend to course:", err);
        } finally {
            setAddingFriendId(null);
        }
    };

    const handleCreateInvite = async () => {
        setInviteLoading(true);
        setInviteError(null);
        try {
            const result = await createCourseInvitation(courseId);
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

    // For public courses, show the direct link
    const handleCopyPublicLink = () => {
        const url = `${window.location.origin}/courses/${courseId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full max-w-lg flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
            
            {/* Section: Share Link */}
            <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                    <FiLink size={16} /> Share Link
                </h3>
                {course.public ? (
                    // Public course: share the direct URL
                    <div className="flex flex-col gap-2">
                        <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
                            This course is public. Share the link:
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={`${typeof window !== "undefined" ? window.location.origin : ""}/courses/${courseId}`}
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
                                onClick={handleCopyPublicLink}
                            >
                                {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                            </Button>
                        </div>
                    </div>
                ) : isOwner ? (
                    // Private course, owner: create invite link
                    inviteUrl ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
                                Share this invite link:
                            </p>
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
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <p className="text-sm" style={{ color: "var(--neutral-600)" }}>
                                Create an invite link for this private course.
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
                    )
                ) : (
                    <p className="text-sm py-2" style={{ color: "var(--neutral-600)" }}>
                        Only the course owner can create invite links for private courses.
                    </p>
                )}
            </div>

            {/* Section: Add Friends */}
            {isOwner && (
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
            )}

            {/* Section: Members */}
            <div className="pt-4 border-t" style={{ borderColor: "var(--neutral-300)" }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                    <FiUser size={16} /> Members
                </h3>
                {loadingMembers ? (
                    <div className="flex justify-center py-4">
                        <FiLoader className="animate-spin w-5 h-5" style={{ color: "var(--foreground)" }} />
                    </div>
                ) : (
                    <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto mb-4">
                        {members.map(member => (
                            <li
                                key={member.id}
                                className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-[var(--neutral-200)]"
                                onClick={() => window.open(`/profile/user/${member.id}`, "_blank")}
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
                                            {member.displayName}
                                        </span>
                                        {member.id === course.ownerId && (
                                            <FaCrown size={12} style={{ color: "var(--accent-500)" }} title="Owner" />
                                        )}
                                        {member.email.toLowerCase() === currentUserEmail.toLowerCase() && (
                                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--neutral-300)", color: "var(--foreground)" }}>
                                                you
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs truncate" style={{ color: "var(--neutral-600)" }}>
                                        {member.email}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </div>
    );
}