"use client"

import { useAuth } from "@/lib/AuthContext"
import { useEffect } from "react";

import LoginPrompt from "../components/login_prompt";
import ProfilePage from "../components/profile/profile_page";

const MyProfilePage = () => {
    const { user } = useAuth();

    useEffect(() => {
        document.title = "Profile - coi";
    }, []);

    if (!user) return(<LoginPrompt page="your profile" />);
    return(<ProfilePage userId={user?.uid} />);
}

export default MyProfilePage;