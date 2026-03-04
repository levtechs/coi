"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FiLogOut, FiUser, FiStar, FiBookOpen, FiHome, FiExternalLink, FiUsers } from "react-icons/fi";
import { FaPaintbrush } from "react-icons/fa6";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { getFriendships } from "@/app/views/friends";
import StarModal from "../dashboard/star_modal";

interface SidebarProps {
    current?: 'profile' | 'courses' | 'dashboard' | 'friends';
}

export default function Sidebar({ current }: SidebarProps) {
    const { setTheme } = useTheme();
    const { user: firebaseUser } = useAuth();
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [starModalVisible, setStarModalVisible] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (!firebaseUser) return;
        getFriendships("pending")
            .then((pending) => {
                const incoming = pending.filter((f) => f.requesterId !== firebaseUser.uid);
                setPendingCount(incoming.length);
            })
            .catch((err) => console.error("Failed to fetch pending friend count:", err));
    }, [firebaseUser]);

    return (
        <>
            <div className="fixed left-0 top-0 h-screen w-16 hover:w-48 transition-all duration-300 bg-[var(--neutral-100)] shadow-lg flex flex-col py-4 group z-10" onMouseLeave={() => setShowThemeMenu(false)}>
                <Link href="/dashboard" className={`flex items-center w-full px-4 py-2 hover:bg-[var(--accent-100)] cursor-pointer ${current === 'dashboard' ? 'bg-[var(--neutral-200)]' : ''}`}>
                    <FiHome className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Dashboard</span>
                </Link>
                <Link href="/courses" className={`flex items-center w-full px-4 py-2 hover:bg-[var(--accent-100)] cursor-pointer ${current === 'courses' ? 'bg-[var(--neutral-200)]' : ''}`}>
                    <FiBookOpen className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Courses</span>
                </Link>
                <Link href="/friends" className={`flex items-center w-full px-4 py-2 hover:bg-[var(--accent-100)] cursor-pointer relative ${current === 'friends' ? 'bg-[var(--neutral-200)]' : ''}`}>
                    <FiUsers className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)]" />
                    {pendingCount > 0 && (
                        <span
                            className="absolute top-1 left-8 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center"
                            style={{ backgroundColor: "var(--accent-500)" }}
                        >
                            {pendingCount}
                        </span>
                    )}
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Friends</span>
                </Link>
                <div className="mt-auto">
                    <Link href="/profile" className={`flex items-center w-full px-4 py-2 hover:bg-[var(--accent-100)] cursor-pointer ${current === 'profile' ? 'bg-[var(--neutral-200)]' : ''}`}>
                        <FiUser className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)]" />
                        <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Profile</span>
                    </Link>
                    <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--accent-100)] cursor-pointer" onClick={() => setStarModalVisible(true)}>
                        <FiStar className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)] group-hover:text-yellow-500" />
                        <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Star</span>
                    </div>
                    <div className="relative w-full">
                        <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--accent-100)] cursor-pointer" onClick={() => setShowThemeMenu(!showThemeMenu)}>
                            <FaPaintbrush className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)]" />
                            <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Theme</span>
                        </div>
                        {showThemeMenu && (
                            <div className="absolute left-full bottom-0 mb-2 w-32 bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded shadow-lg z-20">
                                {["light", "dark", "device", "pink"].map((t) => (
                                    <button
                                        key={t}
                                        className="block w-full text-left px-4 py-2 hover:bg-[var(--neutral-200)] capitalize text-[var(--foreground)]"
                                        onClick={() => { setTheme(t as "light" | "dark" | "device" | "pink"); setShowThemeMenu(false); }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--accent-100)] cursor-pointer" onClick={() => window.open('https://sat.coilearn.com', '_blank')}>
                        <FiExternalLink className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)]" />
                        <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">SAT Practice</span>
                    </div>
                    <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--accent-100)] cursor-pointer" onClick={() => signOut(auth)}>
                        <FiLogOut className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)]" />
                        <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Logout</span>
                    </div>
                </div>
            </div>
            <StarModal
                isOpen={starModalVisible}
                onClose={() => setStarModalVisible(false)}
            />
        </>
    );
}