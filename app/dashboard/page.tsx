"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Dashboard from "@/app/components/dashboard/dashboard";
import Button from "@/app/components/button";
import MaintenencePage from "@/app/components/maintenence";
import LoginPrompt from "../components/login_prompt";
import { FiLogOut, FiUser } from "react-icons/fi";
import { FaPaintbrush } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const { setTheme } = useTheme();
    const [showThemeMenu, setShowThemeMenu] = useState(false);

    useEffect(() => {
        document.title = "Dashboard - coi";
    }, []);

    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
        return (<MaintenencePage />);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <p className="text-xl">Loading authentication...</p>
            </div>
        );
    }

    if (!user) {
        return (<LoginPrompt page={"the dashboard"}/>);
    }

    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Maintenance Mode</h1>
                    <p className="text-lg">The website is currently under maintenance. Please check back later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
            <div className="max-w-5xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                        Welcome, {user.displayName}!
                    </h1>
                    <div className="flex flex-row gap-4 items-center">
                        <Button color="var(--neutral-300)" onClick={() => window.location.href = "/courses"}>
                            Courses
                        </Button>
                        <Button color="var(--error)" onClick={() => signOut(auth)}>
                            <FiLogOut className="h-[25px] w-[25px]"/>
                        </Button>
                        <Button color="var(--accent-400)" onClick={() => window.location.href = "/profile"}>
                            <FiUser className="h-[25px] w-[25px]"/>
                        </Button>
                        <div className="relative">
                            <Button color="var(--neutral-400)" onClick={() => setShowThemeMenu(!showThemeMenu)}>
                                <FaPaintbrush className="h-[25px] w-[25px]"/>
                            </Button>
                            {showThemeMenu && (
                                <div className="absolute right-0 mt-2 w-32 bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded shadow-lg z-10">
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
                    </div>
                </div>

                 <hr/>

                 <Dashboard user={user} />
            </div>
        </div>
    );
}
