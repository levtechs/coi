"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import LoginPrompt from "../../../components/login_prompt";
import { useParams } from "next/navigation";
import { FiLogOut, FiUser, FiStar, FiBookOpen } from "react-icons/fi";
import { FaPaintbrush } from "react-icons/fa6";
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getLesson } from "../../../views/lessons";
import { CourseLesson, Project } from "@/lib/types";
import LoadingComponent from "../../../components/loading";
import LessonPage from "../../../components/courses/lessons/lesson_page";
import Button from "../../../components/button";
import { useTheme } from "@/lib/ThemeContext";

export default function LessonDetailPage() {
    const { user, loading: authLoading } = useAuth();
    const { setTheme } = useTheme();
    const params = useParams();
    const courseId = params.courseId as string;
    const lessonIdx = parseInt(params.lessonIdx as string);
    const [lesson, setLesson] = useState<CourseLesson | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);

    useEffect(() => {
        const fetchLesson = async () => {
            if (!user || !courseId || isNaN(lessonIdx)) return;
            setLoading(true);
            try {
                const result = await getLesson(courseId, lessonIdx);
                if (result) {
                    setLesson(result.lesson);
                }
            } catch (error) {
                console.error("Failed to fetch lesson:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLesson();
    }, [user, courseId, lessonIdx]);

    useEffect(() => {
        if (!user || !lesson) return;

        const projectsQuery = query(
            collection(db, "projects"),
            where("ownerId", "==", user.uid),
            where("courseLesson.id", "==", lesson.id)
        );

        const unsubscribe = onSnapshot(
            projectsQuery,
            (querySnapshot) => {
                const projectsData: Project[] = querySnapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id,
                })) as Project[];
                setProjects(projectsData);
            },
            (error) => {
                console.error("Error listening to projects:", error);
            }
        );

        return () => unsubscribe();
    }, [user, lesson]);

    useEffect(() => {
        if (lesson) {
            document.title = `${lesson.title} - coi`;
        }
    }, [lesson]);

    if (authLoading) {
        return <LoadingComponent small={false} />;
    }

    if (!user) {
        return <LoginPrompt page="courses" />;
    }

    if (loading) {
        return <LoadingComponent small={false} />;
    }

    if (!lesson) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 flex items-center justify-center">
                <p className="text-xl">Lesson not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <div className="fixed left-0 top-0 h-screen w-16 hover:w-48 transition-all duration-300 bg-[var(--neutral-100)] shadow-lg flex flex-col py-4 group z-10" onMouseLeave={() => setShowThemeMenu(false)}>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => window.location.href = "/profile"}>
                    <FiUser className="h-6 w-6 flex-shrink-0 text-[var(--accent-400)] hover:text-[var(--accent-500)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Profile</span>
                </div>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => window.location.href = "/courses"}>
                    <FiBookOpen className="h-6 w-6 flex-shrink-0 text-[var(--accent-400)] hover:text-[var(--accent-500)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Courses</span>
                </div>
                <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => window.location.href = "/dashboard"}>
                    <FiStar className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)] hover:text-[var(--neutral-700)]" />
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Dashboard</span>
                </div>
                <div className="mt-auto">
                    <div className="relative w-full">
                        <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => setShowThemeMenu(!showThemeMenu)}>
                            <FaPaintbrush className="h-6 w-6 flex-shrink-0 text-[var(--neutral-600)] hover:text-[var(--neutral-700)]" />
                            <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Theme</span>
                        </div>
                        {showThemeMenu && (
                            <div className="absolute left-full bottom-0 mb-2 w-32 bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded shadow-lg z-20">
                                {["light", "dark", "device", "pink"].map((t) => (
                                    <button
                                        key={t}
                                        className="block w-full text-left px-4 py-2 hover:bg-[var(--neutral-200)] capitalize text-[var(--foreground)]"
                                        onClick={() => { setTheme(t as "light" | "dark" | "device" | "pink"); setShowThemeMenu(false); }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center w-full px-4 py-2 hover:bg-[var(--neutral-200)] cursor-pointer" onClick={() => signOut(auth)}>
                        <FiLogOut className="h-6 w-6 flex-shrink-0 text-[var(--error)] hover:text-[var(--error)]" />
                        <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Logout</span>
                    </div>
                </div>
            </div>
            <div className="ml-16 p-6 relative z-5">
                <div className="flex items-center gap-4 mb-8">
                    <Button color="var(--neutral-300)" onClick={() => window.location.href = `/courses/${courseId}`}>
                        Back to Course
                    </Button>
                    <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                        Lesson {lessonIdx + 1}: {lesson.title}
                    </h1>
                </div>
                <LessonPage lesson={lesson} courseId={courseId} lessonIdx={lessonIdx} projects={projects} />
            </div>
        </div>
    );
}