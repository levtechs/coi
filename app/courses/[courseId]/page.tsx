"use client";

import { useAuth } from "@/lib/AuthContext";
import LoginPrompt from "../../components/login_prompt";
import LessonCard from "@/app/components/courses/lesson_card"
import { FlickeringGrid } from "@/app/components/flickering-grid";
import Sidebar from "@/app/components/sidebar";
import { FiShare, FiPlay, FiSettings, FiBarChart } from "react-icons/fi";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCourse, getPortfolioReportStatus } from "../../views/courses";
import { getCards } from "../../views/cards";
import { getQuiz } from "../../views/quiz";
// createCourseInvitation is now handled inside CourseSharePanel
import { Course } from "@/lib/types/course";
import { Project } from "@/lib/types/project";
import { Quiz } from "@/lib/types/quiz";
import LoadingComponent from "../../components/loading";
import Analytics from "../../components/courses/analytics/analytics";
import CommentSection from "../../components/courses/comments/comment_section";
import CourseSharePanel from "../../components/courses/course_share_panel";
import CourseResourcePills, { visibleStudentResources } from "../../components/courses/course_resource_pills";
import CourseBrandedHeader from "../../components/courses/course_branded_header";
import CourseBrandedFooter from "../../components/courses/course_branded_footer";
import CourseQuizzesPortfolioSection from "../../components/courses/course_quizzes_portfolio_section";
import Modal from "../../components/modal";
import MarkdownArticle from "../../components/md";

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
    const [portfolioStatus, setPortfolioStatus] = useState<{
        eligible: boolean;
        eligibilityReasons: string[];
        report: { markdown: string; generatedAt: string; id: string } | null;
    } | null>(null);
    const [portfolioRefreshing, setPortfolioRefreshing] = useState(false);
    const [portfolioStatusLoading, setPortfolioStatusLoading] = useState(false);
    const [showPortfolioPreview, setShowPortfolioPreview] = useState(false);

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
            setLessonProgresses({});
            try {
                const result = await getCourse(courseId);
                if (!result) {
                    setCourse(null);
                    setLessonProjects({});
                    setPortfolioStatus(null);
                    setPortfolioStatusLoading(false);
                    setLessonProgresses({});
                    setCourseQuizzes([]);
                } else {
                    setCourse(result.course);
                    setLessonProjects(result.lessonProjects);

                    if (result.course.quizIds && result.course.quizIds.length > 0) {
                        Promise.all(result.course.quizIds.map((id) => getQuiz(id)))
                            .then((quizzes) => {
                                setCourseQuizzes(quizzes.filter((q) => q !== null) as Quiz[]);
                            })
                            .catch((error) => {
                                console.error("Error fetching course quizzes:", error);
                            });
                    } else {
                        setCourseQuizzes([]);
                    }

                    setPortfolioStatusLoading(true);
                    void getPortfolioReportStatus(courseId)
                        .then(setPortfolioStatus)
                        .catch((err) => {
                            console.error("Portfolio report status:", err);
                            setPortfolioStatus(null);
                        })
                        .finally(() => setPortfolioStatusLoading(false));

                    const { lessons } = result.course;
                    const byLesson = result.lessonProjects;
                    void (async () => {
                        try {
                            const entries = await Promise.all(
                                lessons.map(async (lesson) => {
                                    const projects = byLesson[lesson.id] || [];
                                    const totalCards = lesson.cardsToUnlock?.length ?? 0;
                                    if (totalCards === 0 || projects.length === 0) {
                                        return [lesson.id, 0] as const;
                                    }
                                    const perProject = await Promise.all(
                                        projects.map(async (project) => {
                                            try {
                                                const cards = await getCards(project.id);
                                                const unlockedCount = cards.filter((c) => c.isUnlocked).length;
                                                return Math.round((unlockedCount / totalCards) * 100);
                                            } catch (error) {
                                                console.error(`Failed to fetch cards for project ${project.id}:`, error);
                                                return 0;
                                            }
                                        }),
                                    );
                                    return [lesson.id, Math.max(...perProject)] as const;
                                }),
                            );
                            setLessonProgresses(Object.fromEntries(entries));
                        } catch (error) {
                            console.error("Failed to compute lesson progress:", error);
                        }
                    })();
                }
            } catch (error) {
                console.error("Failed to fetch course:", error);
                setPortfolioStatus(null);
                setPortfolioStatusLoading(false);
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
    const canManageCourse = !!user && (course.ownerId === user.uid || (course.staffIds || []).includes(user.uid));

    if (isAnalytics && canManageCourse) {
        return <Analytics courseId={courseId} />;
    }

    const nextLesson = course.lessons
        .sort((a, b) => a.index - b.index)
        .find(lesson => (lessonProgresses[lesson.id] || 0) < 100);

    const courseStudentResources = visibleStudentResources(course.resources);

    return (
        <div className="min-h-screen overflow-x-hidden text-[var(--foreground)]">
            <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
            <FlickeringGrid className="fixed inset-0 z-0 pointer-events-none" />
            <Sidebar current="courses" />
            <div className="relative z-[5] ml-16 flex min-h-screen min-w-0 flex-col">
                <CourseBrandedHeader course={course} className="w-full shrink-0" />

                <div className="p-6 relative z-[5] flex-1 min-w-0 text-left">
                <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-8">
                    {course.title}
                </h1>
                {course.description && (
                    <p className="text-[var(--foreground)] text-lg leading-relaxed mb-8">{course.description}</p>
                )}

                {courseStudentResources.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Resources</h2>
                        <CourseResourcePills resources={courseStudentResources} groupLabel="Course resources" />
                    </div>
                )}

                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Lessons</h2>
                    {course.lessons.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
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

                <CourseQuizzesPortfolioSection
                    courseQuizzes={courseQuizzes}
                    courseId={courseId}
                    portfolioStatus={portfolioStatus}
                    portfolioStatusLoading={portfolioStatusLoading}
                    portfolioRefreshing={portfolioRefreshing}
                    setPortfolioStatus={setPortfolioStatus}
                    setPortfolioRefreshing={setPortfolioRefreshing}
                    onOpenPortfolioPreview={() => setShowPortfolioPreview(true)}
                />

                <div className="flex justify-center gap-4 mb-8">
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
                    {canManageCourse && (
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

                <CourseBrandedFooter footer={course.courseBrandingFooter} courseTitle={course.title} className="w-full shrink-0" />
            </div>

            <Modal
                isOpen={showSharePanel}
                type="empty"
                width="lg"
                title="Share Course"
                onClose={() => setShowSharePanel(false)}
            >
                <CourseSharePanel
                    course={course}
                    courseId={courseId}
                    isOwner={isOwner}
                />
            </Modal>

            <Modal
                isOpen={showPortfolioPreview && !!portfolioStatus?.report}
                type="empty"
                width="4xl"
                title="Portfolio report"
                onClose={() => setShowPortfolioPreview(false)}
            >
                {portfolioStatus?.report && (
                    <>
                        <p className="text-xs text-[var(--neutral-500)] mb-4">
                            Last updated: {new Date(portfolioStatus.report.generatedAt).toLocaleString()}
                        </p>
                        <div className="max-h-[min(70vh,36rem)] overflow-y-auto rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-4 sm:p-6 prose prose-sm dark:prose-invert max-w-none">
                            <MarkdownArticle markdown={portfolioStatus.report.markdown} />
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
 }
