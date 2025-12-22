"use client";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LoginPrompt from "../components/login_prompt";
import { FiLogOut, FiUser, FiStar, FiBookOpen } from "react-icons/fi";
import { FaPaintbrush } from "react-icons/fa6";
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "../components/button";
import CoursesDashboard from "../components/courses/dashboard";
import CreateCourse from "../components/courses/create/create_course";
import { getUserFromId } from "../views/users";
import { User } from "@/lib/types";
import { useTheme } from "@/lib/ThemeContext";

function CoursesPageContent() {
    const { user, loading } = useAuth();
    const { setTheme } = useTheme();
    const searchParams = useSearchParams();
    const isCreateMode = searchParams.get('new') === 'true' || searchParams.has('new') || searchParams.has('edit');
    const [userData, setUserData] = useState<User | null>(null);
    const [showThemeMenu, setShowThemeMenu] = useState(false);

    useEffect(() => {
        if (user) {
            getUserFromId(user.uid).then(setUserData);
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-[var(--foreground)]">
                <p className="text-xl">Loading authentication...</p>
            </div>
        );
    }

    if (!user) {
        return <LoginPrompt page="courses" />;
    }

    return (
        <div className="min-h-screen text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <div className="fixed left-0 top-0 h-screen w-16 hover:w-48 transition-all duration-300 bg-[var(--neutral-100)] shadow-lg flex flex-col py-4 group z-10" onMouseLeave={() => setShowThemeMenu(false)}>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => window.location.href = "/profile"}>
                    <FiUser className="h-6 w-6 flex-shrink-0 text-[var(--accent-400)] hover:text-[var(--accent-500)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Profile</span>
                </div>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => window.location.href = "/courses"}>
                    <FiBookOpen className="h-6 w-6 flex-shrink-0 text-[var(--accent-400)] hover:text-[var(--accent-500)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Courses</span>
                </div>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => window.location.href = "/dashboard"}>
                    <FiStar className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)] hover:text-[var(--neutral-700)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Dashboard</span>
                </div>
                <div className="mt-auto">
                    <div className="relative w-full">
                        <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => setShowThemeMenu(!showThemeMenu)}>
                            <FaPaintbrush className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)] hover:text-[var(--neutral-700)]" />
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
                    <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => signOut(auth)}>
                        <FiLogOut className="h-6 w-6 flex-shrink-0 text-[var(--error)] hover:text-[var(--error)]" />
                        <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Logout</span>
                    </div>
                </div>
            </div>
            <div className="ml-16 p-6 relative z-5">
                <div className="flex items-center gap-4 mb-8">
                    {isCreateMode && (
                        <Button color="var(--neutral-300)" onClick={() => window.location.href = '/courses'}>
                            Back to Courses
                        </Button>
                    )}
                    <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                        {isCreateMode ? (searchParams.has('edit') ? 'Edit Course' : 'Create Course') : 'Courses'}
                    </h1>
                    {!isCreateMode && userData?.starUser && (
                        <button
                            className="px-4 py-2 bg-[var(--accent-500)] text-white rounded hover:bg-[var(--accent-600)]"
                            onClick={() => window.location.href = '/courses?new'}
                        >
                            Create Course
                        </button>
                    )}
                </div>
                {isCreateMode ? <CreateCourse /> : <CoursesDashboard />}
            </div>
        </div>
    );
}

export default function CoursesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <p className="text-xl">Loading...</p>
            </div>
        }>
            <CoursesPageContent />
        </Suspense>
    );
}