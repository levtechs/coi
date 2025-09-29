"use client"

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams, useRouter } from "next/navigation";

import LoginPrompt from "@/app/components/login_prompt";
import ProfilePage from "@/app/components/profile/profile_page";
import LoadingComponent from "@/app/components/loading";

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
        return (<ProfilePage userId={userId} />);
    }

    // Optional fallback while redirecting
    return null;
}

export default MyProfilePage;
