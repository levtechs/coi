"use client";

import { Suspense } from "react";
import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LoginPrompt from "../components/login_prompt";
import { FiHome, FiLogOut, FiUser } from "react-icons/fi";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "../components/button";
import CoursesDashboard from "../components/courses/dashboard";
import CreateCourse from "../components/courses/create/create_course";

function CoursesPageContent() {
    const { user, loading } = useAuth();
    const searchParams = useSearchParams();
    const isCreateMode = searchParams.get('new') === 'true' || searchParams.has('new') || searchParams.has('edit');

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
                          {!isCreateMode && (
                              <Button color="var(--accent-500)" onClick={() => window.location.href = '/courses?new'}>
                                  Create Course
                              </Button>
                          )}
                          <Button color="var(--error)" onClick={() => signOut(auth)}>
                              <FiLogOut className="h-[25px] w-[25px]" />
                          </Button>
                          <Button color="var(--accent-400)" onClick={() => window.location.href = "/profile"}>
                              <FiUser className="h-[25px] w-[25px]" />
                          </Button>
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