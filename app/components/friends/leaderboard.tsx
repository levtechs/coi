"use client";

import { useState, useEffect } from "react";
import { getFriendLeaderboard, LeaderboardEntry } from "@/app/views/friends";
import { FiUser, FiTrendingUp, FiActivity, FiZap } from "react-icons/fi";
import { useRouter } from "next/navigation";

export default function Leaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetch() {
            try {
                const data = await getFriendLeaderboard();
                setEntries(data);
            } catch (err) {
                console.error("Failed to fetch leaderboard:", err);
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 bg-[var(--neutral-200)]">
                <div className="w-5 h-5 border-2 border-[var(--neutral-400)] border-t-[var(--accent-500)] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (entries.length <= 1) {
        return (
            <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                    <FiTrendingUp size={16} className="text-[var(--accent-500)]" />
                    <p className="text-sm font-medium text-[var(--foreground)]">
                        Leaderboard
                    </p>
                </div>
                <p className="text-center text-[var(--neutral-500)] py-4 text-sm">
                    Add friends to see weekly activity rankings!
                </p>
            </div>
        );
    }

    const maxWeekly = Math.max(...entries.map((e) => e.weeklyActions), 1);

    return (
        <div className="p-4 rounded-lg bg-[var(--neutral-200)]">
            <div className="flex items-center gap-2 mb-3">
                <FiTrendingUp size={16} className="text-[var(--accent-500)]" />
                <p className="text-sm font-medium text-[var(--foreground)]">
                    Weekly Leaderboard
                </p>
            </div>

            <div className="flex flex-col gap-2">
                {entries.map((entry, index) => {
                    const barWidth = Math.max((entry.weeklyActions / maxWeekly) * 100, 2);
                    const rank = index + 1;

                    return (
                        <div
                            key={entry.id}
                            className="flex items-center gap-3 group cursor-pointer"
                            onClick={() =>
                                router.push(
                                    entry.isCurrentUser
                                        ? "/profile"
                                        : `/profile/user/${entry.id}`
                                )
                            }
                        >
                            {/* Rank */}
                            <div
                                className="w-6 text-center text-sm font-bold shrink-0"
                                style={{
                                    color:
                                        rank === 1
                                            ? "var(--warning)"
                                            : rank === 2
                                              ? "var(--neutral-500)"
                                              : rank === 3
                                                ? "var(--accent-700)"
                                                : "var(--neutral-400)",
                                }}
                            >
                                {rank}
                            </div>

                            {/* Avatar */}
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                    backgroundColor: entry.isCurrentUser
                                        ? "var(--accent-500)"
                                        : "var(--neutral-400)",
                                }}
                            >
                                <FiUser
                                    size={14}
                                    className="text-white"
                                />
                            </div>

                            {/* Name + bar */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span
                                        className="text-sm truncate group-hover:underline"
                                        style={{
                                            color: entry.isCurrentUser
                                                ? "var(--accent-500)"
                                                : "var(--foreground)",
                                            fontWeight: entry.isCurrentUser
                                                ? 600
                                                : 400,
                                        }}
                                    >
                                        {entry.displayName}
                                        {entry.isCurrentUser && " (you)"}
                                    </span>
                                    <span className="text-xs text-[var(--neutral-500)] ml-2 shrink-0">
                                        {entry.weeklyActions}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 rounded-full bg-[var(--neutral-300)] overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${barWidth}%`,
                                            backgroundColor:
                                                rank === 1
                                                    ? "var(--warning)"
                                                    : entry.isCurrentUser
                                                      ? "var(--accent-500)"
                                                      : "var(--neutral-500)",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stats summary row */}
            <div className="mt-4 pt-3 border-t border-[var(--neutral-300)] flex gap-4">
                {entries.find((e) => e.isCurrentUser) && (
                    <>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-500)]">
                            <FiZap size={12} />
                            <span>
                                Today:{" "}
                                <strong className="text-[var(--foreground)]">
                                    {entries.find((e) => e.isCurrentUser)?.dailyActions ?? 0}
                                </strong>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-500)]">
                            <FiActivity size={12} />
                            <span>
                                All-time:{" "}
                                <strong className="text-[var(--foreground)]">
                                    {entries.find((e) => e.isCurrentUser)?.actions ?? 0}
                                </strong>
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
