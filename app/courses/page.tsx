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
import { User } from "@/lib/types/user";

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
                <div className="mx-auto max-w-6xl">
                    <div className="mb-2 flex flex-col gap-4 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-4">
                            {isCreateMode && (
                                <Button color="var(--neutral-300)" onClick={() => window.location.href = '/courses'}>
                                    Back to Courses
                                </Button>
                            )}
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                                    {isCreateMode ? (searchParams.has('edit') ? 'Edit Course' : 'Create Course') : 'Courses'}
                                </h1>
                                {!isCreateMode && (
                                    <p className="mt-1 max-w-xl text-sm text-[var(--neutral-600)]">
                                        Your enrolled and shared courses, grouped by category.
                                    </p>
                                )}
                            </div>
                        </div>
                        {!isCreateMode && userData?.starUser && (
                            <Link
                                href="/courses?new"
                                className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-600)]"
                            >
                                Create Course
                            </Link>
                        )}
                    </div>
                    {isCreateMode ? <CreateCourse /> : <CoursesDashboard />}
                </div>
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