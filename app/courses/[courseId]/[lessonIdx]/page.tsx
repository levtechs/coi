"use client";

import { useAuth } from "@/lib/AuthContext";
import LoginPrompt from "../../../components/login_prompt";
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Sidebar from "@/app/components/sidebar";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
        <div className="min-h-screen text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <Sidebar current="courses" />
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