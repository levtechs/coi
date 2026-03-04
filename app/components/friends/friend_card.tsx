"use client";

import { FriendshipResponse } from "@/app/views/friends";
import { FiUser, FiCheck, FiX, FiUserMinus } from "react-icons/fi";
import { useRouter } from "next/navigation";

interface FriendCardProps {
    friendship: FriendshipResponse;
    currentUserId: string;
    onAccept?: (id: string) => void;
    onDecline?: (id: string) => void;
    onRemove?: (id: string) => void;
}

export default function FriendCard({
    friendship,
    currentUserId,
    onAccept,
    onDecline,
    onRemove,
}: FriendCardProps) {
    const router = useRouter();
    const { friend, status, requesterId } = friendship;
    const isIncoming = status === "pending" && requesterId !== currentUserId;
    const isOutgoing = status === "pending" && requesterId === currentUserId;

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] transition-colors">
            <div
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                onClick={() => router.push(`/profile/user/${friend.id}`)}
            >
                <div className="w-9 h-9 rounded-full bg-[var(--accent-500)] flex items-center justify-center flex-shrink-0">
                    <FiUser className="text-white" size={16} />
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-[var(--foreground)] truncate">
                        {friend.displayName}
                    </p>
                    <p className="text-xs text-[var(--foreground)] opacity-50 truncate">
                        {friend.email}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {isIncoming && (
                    <>
                        <button
                            onClick={() => onAccept?.(friendship.id)}
                            className="p-1.5 rounded-md text-white transition-colors hover:brightness-90"
                            style={{ backgroundColor: "var(--success)" }}
                            title="Accept"
                        >
                            <FiCheck size={14} />
                        </button>
                        <button
                            onClick={() => onDecline?.(friendship.id)}
                            className="p-1.5 rounded-md text-white transition-colors hover:brightness-90"
                            style={{ backgroundColor: "var(--error)" }}
                            title="Decline"
                        >
                            <FiX size={14} />
                        </button>
                    </>
                )}
                {isOutgoing && (
                    <span className="text-xs text-[var(--foreground)] opacity-50 italic">
                        Pending
                    </span>
                )}
                {status === "accepted" && (
                    <button
                        onClick={() => onRemove?.(friendship.id)}
                        className="p-1.5 rounded-md hover:bg-[var(--neutral-400)] text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all"
                        title="Remove friend"
                    >
                        <FiUserMinus size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
