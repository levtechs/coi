"use client";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import LoginPrompt from "../components/login_prompt";
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Sidebar from "@/app/components/sidebar";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "../components/button";
import CoursesDashboard from "../components/courses/dashboard";
import CreateCourse from "../components/courses/create/create_course";
import { getUserFromId } from "../views/users";
import { User } from "@/lib/types";

function CoursesPageContent() {
    const { user, loading } = useAuth();
    const searchParams = useSearchParams();
    const isCreateMode = searchParams.get('new') === 'true' || searchParams.has('new') || searchParams.has('edit');
    const [userData, setUserData] = useState<User | null>(null);

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
            <Sidebar current="courses" />
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
                        <Link
                            href="/courses?new"
                            className="px-4 py-2 bg-[var(--accent-500)] text-white rounded hover:bg-[var(--accent-600)]"
                        >
                            Create Course
                        </Link>
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