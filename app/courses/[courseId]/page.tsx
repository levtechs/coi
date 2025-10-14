"use client";

import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LoginPrompt from "../../components/login_prompt";
import { FiHome, FiLogOut, FiUser } from "react-icons/fi";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getCourse } from "../../views/courses";
import { getLesson } from "../../views/lessons";
import { getProject } from "../../views/projects";
import { Course, CourseLesson, Project } from "@/lib/types";
import LoadingComponent from "../../components/loading";
import Button from "../../components/button";

interface LessonCardProps {
    lesson: CourseLesson;
    courseId: string;
    projects: Project[];
}

const LessonCard = ({ lesson, courseId, projects }: LessonCardProps) => {
    return (
        <div className="border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] shadow hover:shadow-md transition">
            <div
                className="cursor-pointer"
                onClick={() => window.location.assign(`/courses/${courseId}/${lesson.index}`)}
            >
                <h3 className="text-[var(--foreground)] font-semibold text-xl">{`${lesson.index + 1}. ${lesson.title}`}</h3>
                {lesson.description && (
                    <p className="text-[var(--foreground)] text-sm mt-2 line-clamp-2">{lesson.description}</p>
                )}
            </div>

            {projects.length > 0 && (
                <div className="mt-4">
                    <p className="text-[var(--foreground)] text-sm font-medium mb-2">Projects ({projects.length})</p>
                    <div className="space-y-2">
                        {projects.slice(0, 3).map((project) => (
                            <div
                                key={project.id}
                                className="bg-[var(--neutral-100)] p-2 rounded text-sm cursor-pointer hover:bg-[var(--neutral-300)] transition"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.assign(`/projects/${project.id}`);
                                }}
                            >
                                {project.title}
                            </div>
                        ))}
                        {projects.length > 3 && (
                            <p className="text-[var(--neutral-600)] text-xs">+{projects.length - 3} more</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

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
                const fetchedCourse = await getCourse(courseId);
                setCourse(fetchedCourse);
            } catch (error) {
                console.error("Failed to fetch course:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [user, courseId]);

    useEffect(() => {
        const fetchLessonProjects = async () => {
            if (!course || !user) return;

            const projectsMap: { [lessonId: string]: Project[] } = {};

            await Promise.all(
                course.lessons.map(async (lesson) => {
                    try {
                        const result = await getLesson(courseId, lesson.index);
                        if (result && result.projectIds.length > 0) {
                            const projects = await Promise.all(
                                result.projectIds.map(async (projectId) => {
                                    try {
                                        return await getProject(projectId);
                                    } catch (error) {
                                        console.error(`Failed to fetch project ${projectId}:`, error);
                                        return null;
                                    }
                                })
                            );
                            projectsMap[lesson.id] = projects.filter((p): p is Project => p !== null);
                        }
                    } catch (error) {
                        console.error(`Failed to fetch projects for lesson ${lesson.id}:`, error);
                    }
                })
            );

            setLessonProjects(projectsMap);
        };

        fetchLessonProjects();
    }, [course, user, courseId]);

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
                        <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                            {course.title}
                        </h1>
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
            </div>
        </div>
    );
}