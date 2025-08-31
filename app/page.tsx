"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Dashboard from "@/app/components/dashboard/dashboard";
import Button from "@/app/components/button";
import { useEffect, useState } from "react";

export default function HomePage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <p className="text-xl">Loading authentication...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
                <p className="text-2xl font-semibold mb-4">You are not logged in.</p>
                <p className="text-lg mb-6">Please log in to access the dashboard.</p>
                <Button color="var(--accent-500)" onClick={() => (window.location.href = "/login")}>
                    Go to Login Page
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
            <div className="max-w-5xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                        Welcome, {user.email}!
                    </h1>
                    <Button color="var(--error)" onClick={() => signOut(auth)}>
                        Logout
                    </Button>
                </div>

                <hr/>

                <p className="mt-8 text-[var(--foreground)] text-lg  mb-4">
                    Your projects
                </p>

                <Dashboard />
            </div>
        </div>
    );
}
