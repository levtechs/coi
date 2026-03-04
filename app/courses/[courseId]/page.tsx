"use client";

import { useAuth } from "@/lib/AuthContext";
import LoginPrompt from "../../components/login_prompt";
import LessonCard from "@/app/components/courses/lesson_card"
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Sidebar from "@/app/components/sidebar";
import { FiArrowLeft, FiShare, FiPlay, FiSettings, FiBarChart } from "react-icons/fi";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCourse } from "../../views/courses";
import { getCards } from "../../views/cards";
import { getQuiz } from "../../views/quiz";
// createCourseInvitation is now handled inside CourseSharePanel
import { Course, CourseLesson, Project, Quiz } from "@/lib/types";
import LoadingComponent from "../../components/loading";
import Button from "../../components/button";
import Analytics from "../../components/courses/analytics/analytics";
import CommentSection from "../../components/courses/comments/comment_section";
import CourseSharePanel from "../../components/courses/course_share_panel";

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
    const { user, loading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const isAnalytics = searchParams.get("analytics") !== null;
    const [course, setCourse] = useState<Course | null>(null);
    const [lessonProjects, setLessonProjects] = useState<{ [lessonId: string]: Project[] }>({});
    const [lessonProgresses, setLessonProgresses] = useState<{ [lessonId: string]: number }>({});
    const [courseQuizzes, setCourseQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(false);
    const [courseId, setCourseId] = useState<string>("");
    const [showSharePanel, setShowSharePanel] = useState(false);

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

                    // Fetch course quizzes
                    if (result.course.quizIds && result.course.quizIds.length > 0) {
                        Promise.all(result.course.quizIds.map(id => getQuiz(id))).then(quizzes => {
                            setCourseQuizzes(quizzes.filter(q => q !== null) as Quiz[]);
                        }).catch(error => {
                            console.error('Error fetching course quizzes:', error);
                        });
                    }

                    // Calculate lesson progresses
                    const progresses: { [lessonId: string]: number } = {};
                    for (const lesson of result.course.lessons) {
                        const projects = result.lessonProjects[lesson.id] || [];
                        if (lesson.cardsToUnlock && lesson.cardsToUnlock.length > 0) {
                            if (projects.length > 0) {
                                const totalCards = lesson.cardsToUnlock.length;
                                const progressesForLesson = await Promise.all(
                                    projects.map(async (project) => {
                                        try {
                                            const cards = await getCards(project.id);
                                            const unlockedCount = cards.filter((card) => card.isUnlocked).length;
                                            return Math.round((unlockedCount / totalCards) * 100);
                                        } catch (error) {
                                            console.error(`Failed to fetch cards for project ${project.id}:`, error);
                                            return 0;
                                        }
                                    })
                                );
                                progresses[lesson.id] = Math.max(...progressesForLesson);
                            } else {
                                progresses[lesson.id] = 0;
                            }
                        } else {
                            progresses[lesson.id] = 0;
                        }
                    }
                    setLessonProgresses(progresses);
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

    if (authLoading) {
        return <LoadingComponent small={false} />;
    }

    if (!user) {
        return <LoginPrompt page="courses" />;
    }

    if (loading) {
        return <LoadingComponent small={false} />;
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 flex items-center justify-center">
                <p className="text-xl">Course not found</p>
            </div>
        );
    }

    const isOwner = user && course.ownerId === user.uid;

    if (isAnalytics && isOwner) {
        return <Analytics courseId={courseId} />;
    }

    const nextLesson = course.lessons
        .sort((a, b) => a.index - b.index)
        .find(lesson => (lessonProgresses[lesson.id] || 0) < 100);

    return (
        <div className="min-h-screen text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <Sidebar current="courses" />
            <div className="ml-16 p-6 relative z-5">
                <div className="flex items-center gap-4 mb-8">
                    <Button color="var(--neutral-300)" onClick={() => window.location.href = '/courses'}>
                        Back to Courses
                    </Button>
                    <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                        {course.title}
                    </h1>
                </div>
                {course.description && (
                    <p className="text-[var(--foreground)] text-lg leading-relaxed mb-8">{course.description}</p>
                )}

                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Lessons</h2>
                    {course.lessons.length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                            {course.lessons.sort((a, b) => a.index - b.index).map((lesson) => (
                                <LessonCard
                                    key={lesson.id}
                                    lesson={lesson}
                                    courseId={courseId}
                                    projects={lessonProjects[lesson.id] || []}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--neutral-600)]">No lessons available for this course.</p>
                    )}
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Course Quizzes</h2>
                    {courseQuizzes.length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                            {courseQuizzes.map((quiz) => (
                                <div key={quiz.id} className="bg-[var(--neutral-200)] p-4 rounded-lg shadow">
                                    <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">{quiz.title}</h3>
                                    <p className="text-sm text-[var(--neutral-600)] mb-4">{quiz.description}</p>
                                    <Button color="var(--accent-500)" onClick={() => window.open(`/quiz/${quiz.id}`, '_blank')}>
                                        Take Quiz
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--neutral-600)]">No quizzes available for this course.</p>
                    )}
                </div>

                <div className="flex justify-center gap-4 mb-8">
                    <FiArrowLeft
                        title="Back to Courses"
                        size={32}
                        className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                        onClick={() => window.location.href = '/courses'}
                    />
                    <FiShare
                        title="Share Course"
                        size={32}
                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                        onClick={() => setShowSharePanel(true)}
                    />
                    {nextLesson && (
                        <FiPlay
                            title="Continue"
                            size={32}
                            className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                            onClick={() => window.location.href = `/courses/${courseId}/${nextLesson.index}`}
                        />
                    )}
                    {isOwner && (
                        <>
                            <FiSettings
                                title="Edit Course"
                                size={32}
                                className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                onClick={() => window.location.href = `/courses?edit=${course.id}`}
                            />
                            <FiBarChart
                                title="Analytics"
                                size={32}
                                className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                onClick={() => window.location.href = `/courses/${courseId}?analytics`}
                            />
                        </>
                    )}
                </div>

                <CommentSection courseId={courseId} isCourseOwner={isOwner} />
            </div>

            {showSharePanel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
                    <div className="bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-[28rem] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[var(--foreground)] font-semibold text-xl">Share Course</h2>
                            <button
                                onClick={() => setShowSharePanel(false)}
                                className="text-[var(--neutral-600)] hover:text-[var(--foreground)] transition-colors text-xl leading-none"
                            >
                                &times;
                            </button>
                        </div>
                        <CourseSharePanel
                            course={course}
                            courseId={courseId}
                            isOwner={isOwner}
                        />
                    </div>
                </div>
            )}
        </div>
    );
 }
