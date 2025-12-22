"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Dashboard from "@/app/components/dashboard/dashboard";
import { getUserFromId } from "@/app/views/users";
import { User } from "@/lib/types";

import MaintenencePage from "@/app/components/maintenence";
import LoginPrompt from "../components/login_prompt";
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Sidebar from "@/app/components/sidebar";
import { useEffect, useState } from "react";
import SignUpQuestionnaireModal from "@/app/components/signup/sign_up_questionnaire_modal";

export default function DashboardPage() {
    const { user: firebaseUser, loading: authLoading } = useAuth();
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
            <Sidebar current="dashboard" />
            <div className="ml-16 p-6 relative z-5">
                <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-8">
                    Welcome, {firebaseUser.displayName}!
                </h1>
                <Dashboard user={firebaseUser} />
            </div>
            <SignUpQuestionnaireModal
                isOpen={showQuestionnaireModal}
                onClose={() => setShowQuestionnaireModal(false)}
                userId={firebaseUser.uid}
            />
        </div>
    );
}
