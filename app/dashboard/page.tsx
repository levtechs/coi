"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Dashboard from "@/app/components/dashboard/dashboard";
import Button from "@/app/components/button";
import LoginPrompt from "../components/login_prompt";
import { FiLogOut, FiUser } from "react-icons/fi";
import { useEffect } from "react";

export default function DashboardPage() {
    const { user, loading } = useAuth();

    useEffect(() => {
        document.title = "Dashboard - coi";
    }, []);

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

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
            <div className="max-w-5xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                        Welcome, {user.displayName}!
                    </h1>
                    <div className="flex flex-row gap-4" >
                        <Button color="var(--error)" onClick={() => signOut(auth)}>
                            <FiLogOut className="h-[25px] w-[25px]"/>
                        </Button>
                        <Button color="var(--accent-400)" onClick={() => window.location.href = "/profile"}>
                            <FiUser className="h-[25px] w-[25px]"/>
                        </Button>
                    </div>
                </div>

                <hr/>

                <p className="mt-8 text-[var(--foreground)] text-lg  mb-4">
                    Your projects
                </p>

                <Dashboard user={user} />
            </div>
        </div>
    );
}
