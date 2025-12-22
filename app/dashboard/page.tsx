"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Dashboard from "@/app/components/dashboard/dashboard";
import { getUserFromId } from "@/app/views/users";
import { User } from "@/lib/types";

import MaintenencePage from "@/app/components/maintenence";
import LoginPrompt from "../components/login_prompt";
import { FiLogOut, FiUser, FiStar, FiBookOpen } from "react-icons/fi";
import { FaPaintbrush } from "react-icons/fa6";
import { FlickeringGrid } from "@/app/components/flickering-grid";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import StarModal from "./star_modal";
import SignUpQuestionnaireModal from "@/app/components/signup/sign_up_questionnaire_modal";

export default function DashboardPage() {
    const { user: firebaseUser, loading: authLoading } = useAuth();
    const { setTheme } = useTheme();
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [starModalVisible, setStarModalVisible] = useState(false);
    const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
    const [fullUser, setFullUser] = useState<User | null>(null);
    const [userLoading, setUserLoading] = useState(false);

    useEffect(() => {
        document.title = "Dashboard - coi";
    }, []);

    useEffect(() => {
        // Fetch full user data when firebase user is available
        if (firebaseUser && !fullUser && !userLoading) {
            setUserLoading(true);
            getUserFromId(firebaseUser.uid)
                .then(setFullUser)
                .catch(err => console.error("Failed to fetch user data:", err))
                .finally(() => setUserLoading(false));
        }
    }, [firebaseUser, fullUser, userLoading]);

    useEffect(() => {
        // Check if user needs to fill out sign-up questionnaire
        // Only show if they haven't submitted responses OR if their responses are empty
        if (fullUser && (!fullUser.signUpResponses ||
            (fullUser.signUpResponses.howDidYouHear.length === 0 &&
             fullUser.signUpResponses.interests.length === 0 &&
             !fullUser.signUpResponses.role))) {
            // Small delay to ensure dashboard loads first
            const timer = setTimeout(() => {
                setShowQuestionnaireModal(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [fullUser]);

    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
        return (<MaintenencePage />);
    }

    if (authLoading || userLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <p className="text-xl">Loading...</p>
            </div>
        );
    }

    if (!firebaseUser) {
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
        <div className="min-h-screen text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <div className="fixed left-0 top-0 h-screen w-16 hover:w-48 transition-all duration-300 bg-[var(--neutral-100)] shadow-lg flex flex-col py-4 group z-10" onMouseLeave={() => setShowThemeMenu(false)}>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => window.location.href = "/profile"}>
                    <FiUser className="h-6 w-6 flex-shrink-0 text-[var(--accent-400)] hover:text-[var(--accent-500)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Profile</span>
                </div>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => window.location.href = "/courses"}>
                    <FiBookOpen className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)] hover:text-[var(--neutral-700)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Courses</span>
                </div>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => setStarModalVisible(true)}>
                    <FiStar className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)] hover:text-[var(--neutral-700)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Star</span>
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
                <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-8">
                    Welcome, {firebaseUser.displayName}!
                </h1>
                <Dashboard user={firebaseUser} />
            </div>
            <StarModal
                isOpen={starModalVisible}
                onClose={() => setStarModalVisible(false)}
            />
            <SignUpQuestionnaireModal
                isOpen={showQuestionnaireModal}
                onClose={() => setShowQuestionnaireModal(false)}
                userId={firebaseUser.uid}
            />
        </div>
    );
}
