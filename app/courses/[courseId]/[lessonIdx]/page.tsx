"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import LoginPrompt from "../../../components/login_prompt";
import { useParams } from "next/navigation";
import { FiHome, FiLogOut, FiUser } from "react-icons/fi";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getLesson } from "../../../views/lessons";
import { CourseLesson, Project } from "@/lib/types";
import LoadingComponent from "../../../components/loading";
import LessonPage from "../../../components/courses/lessons/lesson_page";
import Button from "../../../components/button";

export default function LessonDetailPage() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams();
    const courseId = params.courseId as string;
    const lessonIdx = parseInt(params.lessonIdx as string);
    const [lesson, setLesson] = useState<CourseLesson | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);

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
                         <Button color="var(--neutral-300)" onClick={() => window.location.href = `/courses/${courseId}`}>
                             Back to Course
                         </Button>
                     </div>
                        <div className="flex flex-row gap-4 items-center">
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

                 <div className="mt-8">
                      <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-4">
                          Lesson {lessonIdx + 1}: {lesson.title}
                      </h1>
                      <LessonPage lesson={lesson} courseId={courseId} lessonIdx={lessonIdx} projects={projects} />
                 </div>
            </div>
        </div>
    );
}