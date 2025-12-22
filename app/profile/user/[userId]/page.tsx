"use client"

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams, useRouter } from "next/navigation";

import LoginPrompt from "@/app/components/login_prompt";
import ProfilePage from "@/app/components/profile/profile_page";
import LoadingComponent from "@/app/components/loading";
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Sidebar from "@/app/components/sidebar";

const MyProfilePage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();

    const slugParam = params?.userId;
    const userId = Array.isArray(slugParam) ? slugParam[0] : slugParam;

    useEffect(() => {
        document.title = "User Profile - coi";
    }, []);

    useEffect(() => {
        if (user && userId && user.uid === userId) {
            router.push("/profile");
        }
    }, [user, userId, router]);

    if (!user) return (<LoginPrompt page="this profile" />);
    if (!userId) return (<LoadingComponent loadingText="Loading user" />);

    // Only render this if user.uid !== userId
    if (user && userId && user.uid !== userId) {
        return (
            <div className="min-h-screen text-[var(--foreground)]">
                <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
                <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
                <Sidebar current="profile" />
                <div className="ml-16 p-6 relative z-5">
                    <ProfilePage userId={userId} />
                </div>
            </div>
        );
    }

    // Optional fallback while redirecting
    return null;
}

export default MyProfilePage;
