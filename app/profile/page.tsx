"use client"

import { useAuth } from "@/lib/AuthContext"
import { useEffect } from "react";

import LoginPrompt from "../components/login_prompt";
import ProfilePage from "../components/profile/profile_page";
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Sidebar from "@/app/components/sidebar";

const MyProfilePage = () => {
    const { user } = useAuth();

    useEffect(() => {
        document.title = "Profile - coi";
    }, []);

    if (!user) return(<LoginPrompt page="your profile" />);
    return (
        <div className="min-h-screen text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <Sidebar current="profile" />
            <div className="ml-16 p-6 relative z-5">
                <ProfilePage userId={user?.uid} />
            </div>
        </div>
    );
}

export default MyProfilePage;