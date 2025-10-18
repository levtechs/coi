"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LoginPrompt from "../../components/login_prompt";
import LessonCard from "@/app/components/courses/lesson_card" 
import { FiHome, FiLogOut, FiUser } from "react-icons/fi";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getCourse } from "../../views/courses";
import { Course, CourseLesson, Project } from "@/lib/types";
import LoadingComponent from "../../components/loading";
import Button from "../../components/button";

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
    const { user, loading: authLoading } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [lessonProjects, setLessonProjects] = useState<{ [lessonId: string]: Project[] }>({});
    const [loading, setLoading] = useState(true);
    const [courseId, setCourseId] = useState<string>("");

    useEffect(() => {
        const fetchParams = async () => {
            const { courseId } = await params;
            setCourseId(courseId);
        };
        fetchParams();
    }, [params]);

    useEffect(() => {
        const fetchCourse = async () => {
            if (!user || !courseId) return;
            setLoading(true);
            try {
                const result = await getCourse(courseId);
                if (result) {
                    setCourse(result.course);
                    setLessonProjects(result.lessonProjects);
                }
            } catch (error) {
                console.error("Failed to fetch course:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [user, courseId]);

    useEffect(() => {
        if (course) {
            document.title = `${course.title} - coi`;
        }
    }, [course]);

    if (authLoading || loading) {
        return <LoadingComponent small={false} />;
    }

    if (!user) {
        return <LoginPrompt page="courses" />;
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 flex items-center justify-center">
                <p className="text-xl">Course not found</p>
            </div>
        );
    }

    const isOwner = user && course.ownerId === user.uid;

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
                         <Button color="var(--neutral-300)" onClick={() => window.location.href = '/courses'}>
                             Back to Courses
                         </Button>
                     </div>
                     <div className="flex flex-row gap-4 items-center">
                         <Button color="var(--error)" onClick={() => signOut(auth)}>
                             <FiLogOut className="h-[25px] w-[25px]" />
                         </Button>
                         <Button color="var(--accent-400)" onClick={() => window.location.href = "/profile"}>
                             <FiUser className="h-[25px] w-[25px]" />
                         </Button>
                     </div>
                 </div>

                 <hr />

                 <div className="mt-8">
                     <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-4">
                         {course.title}
                     </h1>
                     {course.description && (
                         <p className="text-[var(--foreground)] text-lg leading-relaxed">{course.description}</p>
                     )}
                 </div>

                 <div className="mt-8">
                     <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Lessons</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {course.lessons.sort((a, b) => a.index - b.index).map((lesson) => (
                             <LessonCard
                                 key={lesson.id}
                                 lesson={lesson}
                                 courseId={courseId}
                                 projects={lessonProjects[lesson.id] || []}
                             />
                         ))}
                     </div>
                 </div>

                 {isOwner && (
                     <div className="mt-8 flex justify-center">
                         <Button color="var(--accent-500)" onClick={() => window.location.href = `/courses?edit=${course.id}`}>
                             Edit Course
                         </Button>
                     </div>
                 )}
            </div>
        </div>
    );
}
