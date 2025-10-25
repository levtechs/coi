"use client";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LoginPrompt from "../components/login_prompt";
import { FiHome, FiLogOut, FiUser, FiEdit } from "react-icons/fi";
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
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <p className="text-xl">Loading authentication...</p>
            </div>
        );
    }

    if (!user) {
        return <LoginPrompt page="courses" />;
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
            <div className="max-w-5xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
                <div className="flex justify-between items-center mb-8 gap-4">
                     <div className="flex items-center gap-4">
                         <Link href="/dashboard">
                             <FiHome
                                 size={32}
                                 className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                             />
                         </Link>
                         {isCreateMode && (
                             <Button color="var(--neutral-300)" onClick={() => window.location.href = '/courses'}>
                                 Back to Courses
                             </Button>
                         )}
                          <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                              {isCreateMode ? (searchParams.has('edit') ? 'Edit Course' : 'Create Course') : 'Courses'}
                          </h1>
                     </div>
                      <div className="flex flex-row gap-4 items-center">
                            {!isCreateMode && userData?.starUser && (
                                <FiEdit
                                    title="Create Course"
                                    className="h-[25px] w-[25px] text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                                    onClick={() => window.location.href = '/courses?new'}
                                />
                            )}
                            <FiUser
                                title="Profile"
                                className="h-[25px] w-[25px] text-[var(--accent-400)] hover:text-[var(--accent-500)] cursor-pointer"
                                onClick={() => window.location.href = "/profile"}
                            />
                            <FiLogOut
                                title="Logout"
                                className="h-[25px] w-[25px] text-[var(--error)] hover:text-[var(--error)] cursor-pointer"
                                onClick={() => signOut(auth)}
                            />
                      </div>
                </div>

                 <hr />

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