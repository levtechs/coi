"use client";

import { useState } from "react";
import Link from "next/link";
import { FiLogOut, FiUser, FiStar, FiBookOpen, FiHome } from "react-icons/fi";
import { FaPaintbrush } from "react-icons/fa6";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/lib/ThemeContext";
import StarModal from "../dashboard/star_modal";

interface SidebarProps {
    current?: 'profile' | 'courses' | 'dashboard';
}

export default function Sidebar({ current }: SidebarProps) {
    const { setTheme } = useTheme();
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [starModalVisible, setStarModalVisible] = useState(false);

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