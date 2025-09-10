"use client"

import { useAuth } from "@/lib/AuthContext"
import { useParams } from "next/navigation";

import LoginPrompt from "@/app/components/login_prompt";
import ProfilePage from "@/app/components/profile/profile_page";
import LoadingComponent from "@/app/components/loading";

const MyProfilePage = () => {
    const { user } = useAuth();
    const params = useParams();

    const slugParam = params?.userId;
    const userId = Array.isArray(slugParam) ? slugParam[0] : slugParam;
    
    if (!user) return(<LoginPrompt page="this profile" />);
    if (!userId) return (<LoadingComponent loadingText="Loading user" />);
    return(<ProfilePage userId={userId} />);
}

export default MyProfilePage;