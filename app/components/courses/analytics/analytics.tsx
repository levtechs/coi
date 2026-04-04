"use client";

import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiBarChart2, FiBookOpen, FiCopy, FiDownload, FiFileText, FiRefreshCw, FiSettings, FiUsers, FiZap } from "react-icons/fi";
import {
    getCourse,
    fetchAnalytics,
    fetchCourseAnalyticsOverviewList,
    fetchCourseAnalyticsOverviewByReportId,
    ensureCourseAnalyticsOverview,
    getPortfolioReportStatus,
    regeneratePortfolioReport,
} from "../../../views/courses";
import { Course, CoursePortfolioReportSummary, CourseStudentProgress } from "@/lib/types/course";
import { CourseAnalyticsRollups } from "@/lib/types/course_analytics";
import Button from "../../button";
import Modal from "../../modal";
import MarkdownArticle from "../../md";

interface AnalyticsProps {
    courseId: string;
}

const emptyRollups: CourseAnalyticsRollups = {
    quizzes: [],
    unlocksByLesson: {},
    lessonTiming: [],
};

function formatDurationMs(ms: number | null): string {
    if (ms == null || !Number.isFinite(ms)) return "—";
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function hasAnalyticsProgress(
    students: CourseStudentProgress[],
    rollups: CourseAnalyticsRollups,
): boolean {
    if (students.length === 0) return false;
    if (students.some((s) => Object.keys(s.lessonProgress || {}).length > 0)) return true;
    if (rollups.quizzes.some((q) => q.totalAttempts > 0)) return true;
    if (rollups.lessonTiming.some((l) => l.startedCount > 0)) return true;
    return false;
}

const Analytics = ({ courseId }: AnalyticsProps) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [analyticsData, setAnalyticsData] = useState({
        totalUsers: 0,
        invitations: [] as { token: string; createdAt: string; createdBy?: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[],
        students: [] as CourseStudentProgress[],
        rollups: emptyRollups,
    });
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<"report" | "course" | "invites" | "students">("report");
    const [overviewMarkdown, setOverviewMarkdown] = useState<string | null>(null);
    const [overviewMeta, setOverviewMeta] = useState<{ id: string; generatedAt: string } | null>(null);
    const [overviewHistory, setOverviewHistory] = useState<{ id: string; generatedAt: string }[]>([]);
    const [overviewBusy, setOverviewBusy] = useState(true);
    const [overviewRegenerating, setOverviewRegenerating] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentReportState, setStudentReportState] = useState<{
        studentId: string;
        eligible: boolean;
        eligibilityReasons: string[];
        reports: CoursePortfolioReportSummary[];
    } | null>(null);
    const [studentReportsLoading, setStudentReportsLoading] = useState(false);
    const [studentReportGenerating, setStudentReportGenerating] = useState(false);
    const [reportModal, setReportModal] = useState<{ id: string; generatedAt: string; markdown: string } | null>(null);
    const [reportModalLoading, setReportModalLoading] = useState(false);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const result = await getCourse(courseId);
                if (result) {
                    setCourse(result.course);
                }
            } catch (error) {
                console.error("Failed to fetch course:", error);
            }
        };
        fetchCourse();
    }, [courseId]);

    useEffect(() => {
        if (!selectedStudentId && analyticsData.students.length > 0) {
            setSelectedStudentId(analyticsData.students[0].userId);
        }
    }, [analyticsData.students, selectedStudentId]);

    useEffect(() => {
        const loadStudentReports = async () => {
            if (!selectedStudentId) {
                setStudentReportState(null);
                return;
            }

            setStudentReportsLoading(true);
            try {
                const data = await getPortfolioReportStatus(courseId, {
                    studentId: selectedStudentId,
                    includeHistory: true,
                });
                setStudentReportState({
                    studentId: selectedStudentId,
                    eligible: data.eligible,
                    eligibilityReasons: data.eligibilityReasons,
                    reports: data.reports || [],
                });
            } catch (error) {
                console.error("Error fetching student report history:", error);
                setStudentReportState({
                    studentId: selectedStudentId,
                    eligible: false,
                    eligibilityReasons: ["Could not load report history."],
                    reports: [],
                });
            } finally {
                setStudentReportsLoading(false);
            }
        };

        loadStudentReports();
    }, [courseId, selectedStudentId]);

    const sortedLessons = useMemo(() => [...(course?.lessons || [])].sort((a, b) => a.index - b.index), [course]);
    const selectedStudent = useMemo(
        () => analyticsData.students.find((student) => student.userId === selectedStudentId) || null,
        [analyticsData.students, selectedStudentId],
    );
    const completedStudents = analyticsData.students.filter((student) => (student.completedLessonsCount || 0) >= sortedLessons.filter((lesson) => !lesson.optional).length).length;
    const studentsWithReports = analyticsData.students.filter((student) => !!student.portfolioReportGeneratedAt).length;
    const averageCompletedLessons = analyticsData.students.length > 0
        ? (analyticsData.students.reduce((sum, student) => sum + (student.completedLessonsCount || 0), 0) / analyticsData.students.length)
        : 0;
    const averageBestCourseQuiz = analyticsData.students.filter((student) => student.bestCourseQuizAttempt)
        .reduce((sum, student, _index, arr) => sum + ((student.bestCourseQuizAttempt?.percentScore || 0) / arr.length), 0);

    const lessonRollup = sortedLessons.map((lesson) => {
        const entries = analyticsData.students.map((student) => student.lessonProgress?.[lesson.id]).filter(Boolean);
        const completed = entries.filter((entry) => !!entry?.completedAt).length;
        const started = entries.length;
        return { lesson, started, completed };
    });

    const downloadMarkdown = (markdown: string, filename: string) => {
        const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(href);
    };

    const openReport = async (reportId: string) => {
        if (!selectedStudentId) return;
        setReportModalLoading(true);
        try {
            const data = await getPortfolioReportStatus(courseId, {
                studentId: selectedStudentId,
                reportId,
            });
            if (data.selectedReport) {
                setReportModal(data.selectedReport);
            }
        } catch (error) {
            console.error("Error fetching report:", error);
        } finally {
            setReportModalLoading(false);
        }
    };

    const refreshSelectedStudentReports = async () => {
        if (!selectedStudentId) return;
        setStudentReportsLoading(true);
        try {
            const data = await getPortfolioReportStatus(courseId, {
                studentId: selectedStudentId,
                includeHistory: true,
            });
            setStudentReportState({
                studentId: selectedStudentId,
                eligible: data.eligible,
                eligibilityReasons: data.eligibilityReasons,
                reports: data.reports || [],
            });
        } catch (error) {
            console.error("Error refreshing student reports:", error);
        } finally {
            setStudentReportsLoading(false);
        }
    };

    const generateStudentReport = async () => {
        if (!selectedStudentId) return;
        setStudentReportGenerating(true);
        try {
            const report = await regeneratePortfolioReport(courseId, selectedStudentId);
            await refreshSelectedStudentReports();
            setReportModal(report);
        } catch (error) {
            console.error("Error generating student report:", error);
            alert((error as Error).message);
        } finally {
            setStudentReportGenerating(false);
        }
    };

    const formatStudentName = (student: CourseStudentProgress) => student.displayName || student.email || student.userId;
    const tabButtonClass = (view: "report" | "course" | "invites" | "students") =>
        `rounded-full px-4 py-2 text-sm font-medium transition ${activeView === view ? "bg-[var(--accent-500)] text-white" : "bg-[var(--neutral-200)] text-[var(--foreground)] hover:bg-[var(--neutral-300)]"}`;

    useEffect(() => {
        const load = async () => {
            if (!courseId) return;
            setOverviewBusy(true);
            try {
                const data = await fetchAnalytics(courseId);
                if (data) {
                    setAnalyticsData({
                        ...data,
                        rollups: data.rollups ?? emptyRollups,
                    });
                }

                const list = await fetchCourseAnalyticsOverviewList(courseId);
                if (list?.latest) {
                    setOverviewMarkdown(list.latest.markdown);
                    setOverviewMeta({ id: list.latest.id, generatedAt: list.latest.generatedAt });
                    setOverviewHistory(list.history);
                } else {
                    setOverviewHistory(list?.history || []);
                }

                const rollups = data?.rollups ?? emptyRollups;
                const students = data?.students ?? [];
                if (data && hasAnalyticsProgress(students, rollups)) {
                    const ensured = await ensureCourseAnalyticsOverview(courseId, false);
                    if (ensured) {
                        setOverviewMarkdown(ensured.markdown);
                        setOverviewMeta({ id: ensured.id, generatedAt: ensured.generatedAt });
                        const refreshed = await fetchCourseAnalyticsOverviewList(courseId);
                        if (refreshed?.history) setOverviewHistory(refreshed.history);
                    }
                }
            } catch (error) {
                console.error("Error loading analytics or overview:", error);
            } finally {
                setOverviewBusy(false);
            }
        };
        load();
    }, [courseId]);

    const regenerateOverview = async () => {
        setOverviewRegenerating(true);
        try {
            const result = await ensureCourseAnalyticsOverview(courseId, true);
            if (result) {
                setOverviewMarkdown(result.markdown);
                setOverviewMeta({ id: result.id, generatedAt: result.generatedAt });
                const refreshed = await fetchCourseAnalyticsOverviewList(courseId);
                if (refreshed?.history) setOverviewHistory(refreshed.history);
            }
        } catch (error) {
            console.error("Regenerate overview failed:", error);
            alert((error as Error).message);
        } finally {
            setOverviewRegenerating(false);
        }
    };

    const loadOverviewFromHistory = async (reportId: string) => {
        const report = await fetchCourseAnalyticsOverviewByReportId(courseId, reportId);
        if (report) {
            setOverviewMarkdown(report.markdown);
            setOverviewMeta({ id: report.id, generatedAt: report.generatedAt });
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
            <div className="max-w-7xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-3xl p-8 border border-[var(--neutral-300)]">
                <div className="flex items-center justify-between mb-8">
                    <FiArrowLeft
                        size={32}
                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                        onClick={() => window.location.href = `/courses/${courseId}`}
                    />
                    <div className="text-center">
                        <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
                            Course Analytics
                        </h1>
                        {course && (
                            <div className="mt-2">
                                <p className="text-lg text-[var(--foreground)]">{course.title}</p>
                                <p className="text-sm text-[var(--neutral-600)]">{course.lessons.length} lessons</p>
                            </div>
                        )}
                    </div>
                    <FiSettings
                        size={32}
                        className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                        onClick={() => window.location.href = `/courses?edit=${course?.id}`}
                    />
                </div>

                <div className="mb-8 flex flex-wrap gap-3">
                    <button type="button" className={tabButtonClass("report")} onClick={() => setActiveView("report")}><FiFileText className="inline mr-2" />AI overview</button>
                    <button type="button" className={tabButtonClass("course")} onClick={() => setActiveView("course")}><FiBarChart2 className="inline mr-2" />Course</button>
                    <button type="button" className={tabButtonClass("invites")} onClick={() => setActiveView("invites")}><FiBookOpen className="inline mr-2" />Invites</button>
                    <button type="button" className={tabButtonClass("students")} onClick={() => setActiveView("students")}><FiUsers className="inline mr-2" />Students</button>
                </div>

                <>
                           {activeView === "report" && (
                               <div className="bg-[var(--neutral-200)] p-6 rounded-2xl shadow space-y-4">
                                   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                       <div>
                                           <h3 className="text-xl font-semibold text-[var(--foreground)]">AI analytics overview</h3>
                                           <p className="text-sm text-[var(--neutral-600)] mt-1">
                                               Generated from course metrics and anonymized learner questions. Refreshes automatically when you open this page if data has changed enough (cached ~45 minutes).
                                           </p>
                                       </div>
                                       <div className="flex flex-wrap items-center gap-3">
                                           {overviewHistory.length > 0 ? (
                                               <label className="text-sm text-[var(--neutral-600)] flex items-center gap-2">
                                                   <span>History</span>
                                                   <select
                                                       className="rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] px-3 py-2 text-sm text-[var(--foreground)]"
                                                       value={overviewMeta?.id || ""}
                                                       onChange={(e) => {
                                                           const v = e.target.value;
                                                           if (v) void loadOverviewFromHistory(v);
                                                       }}
                                                   >
                                                       {overviewHistory.map((h) => (
                                                           <option key={h.id} value={h.id}>
                                                               {new Date(h.generatedAt).toLocaleString()}
                                                           </option>
                                                       ))}
                                                   </select>
                                               </label>
                                           ) : null}
                                           <Button
                                               color="var(--accent-500)"
                                               disabled={
                                                   overviewRegenerating
                                                   || overviewBusy
                                                   || !hasAnalyticsProgress(analyticsData.students, analyticsData.rollups)
                                               }
                                               onClick={() => void regenerateOverview()}
                                           >
                                               <span className="inline-flex items-center gap-2"><FiZap />{overviewRegenerating ? "Generating…" : "Regenerate"}</span>
                                           </Button>
                                           {overviewMarkdown && overviewMeta ? (
                                               <Button
                                                   color="var(--neutral-300)"
                                                   onClick={() => downloadMarkdown(overviewMarkdown, `course-overview-${courseId.slice(0, 8)}-${overviewMeta.id.slice(0, 8)}.md`)}
                                               >
                                                   <span className="inline-flex items-center gap-2"><FiDownload />Download</span>
                                               </Button>
                                           ) : null}
                                       </div>
                                   </div>

                                   {overviewBusy ? (
                                       <p className="text-[var(--neutral-600)] py-8 text-center">Loading overview…</p>
                                   ) : !hasAnalyticsProgress(analyticsData.students, analyticsData.rollups) ? (
                                       <p className="text-[var(--neutral-600)] py-8 text-center">There is no learner progress yet. When students start lessons or take quizzes, an overview can be generated here.</p>
                                   ) : !overviewMarkdown ? (
                                       <p className="text-[var(--neutral-600)] py-8 text-center">Overview could not be generated. Try Regenerate.</p>
                                   ) : (
                                       <div className="rounded-xl border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-4">
                                           {overviewMeta ? (
                                               <p className="text-xs text-[var(--neutral-600)] mb-3">
                                                   {overviewRegenerating ? "Updating…" : `Generated ${new Date(overviewMeta.generatedAt).toLocaleString()}`}
                                               </p>
                                           ) : null}
                                           <div className="max-h-[70vh] overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                                               <MarkdownArticle markdown={overviewMarkdown} />
                                           </div>
                                       </div>
                                   )}
                               </div>
                           )}

                           {activeView === "course" && (
                               <>
                                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                                       <div className="rounded-2xl bg-[var(--neutral-200)] p-5 shadow">
                                           <p className="text-sm text-[var(--neutral-600)] mb-2">Members</p>
                                           <p className="text-3xl font-bold text-[var(--accent-500)]">{analyticsData.totalUsers}</p>
                                       </div>
                                       <div className="rounded-2xl bg-[var(--neutral-200)] p-5 shadow">
                                           <p className="text-sm text-[var(--neutral-600)] mb-2">Students active</p>
                                           <p className="text-3xl font-bold text-[var(--accent-500)]">{analyticsData.students.length}</p>
                                       </div>
                                       <div className="rounded-2xl bg-[var(--neutral-200)] p-5 shadow">
                                           <p className="text-sm text-[var(--neutral-600)] mb-2">Students complete</p>
                                           <p className="text-3xl font-bold text-[var(--accent-500)]">{completedStudents}</p>
                                       </div>
                                       <div className="rounded-2xl bg-[var(--neutral-200)] p-5 shadow">
                                           <p className="text-sm text-[var(--neutral-600)] mb-2">Reports generated</p>
                                           <p className="text-3xl font-bold text-[var(--accent-500)]">{studentsWithReports}</p>
                                       </div>
                                   </div>

                                   <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
                                       <div className="bg-[var(--neutral-200)] p-6 rounded-2xl shadow">
                                           <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Student progress snapshot</h3>
                                           {analyticsData.students.length === 0 ? (
                                               <p className="text-[var(--neutral-600)]">No student progress recorded yet.</p>
                                           ) : (
                                               <div className="overflow-x-auto">
                                                   <table className="w-full text-sm">
                                                       <thead>
                                                           <tr className="text-left border-b border-[var(--neutral-300)]">
                                                               <th className="py-2 pr-4">Student</th>
                                                               <th className="py-2 pr-4">Completed</th>
                                                               <th className="py-2 pr-4">Best course quiz</th>
                                                               <th className="py-2">Latest report</th>
                                                           </tr>
                                                       </thead>
                                                       <tbody>
                                                           {analyticsData.students.map((student) => (
                                                               <tr key={student.userId} className="border-b border-[var(--neutral-300)] align-top">
                                                                   <td className="py-3 pr-4">
                                                                       <div className="font-medium text-[var(--foreground)]">{formatStudentName(student)}</div>
                                                                       {student.email && <div className="text-[var(--neutral-600)]">{student.email}</div>}
                                                                   </td>
                                                                   <td className="py-3 pr-4">{student.completedLessonsCount || 0}/{sortedLessons.filter((lesson) => !lesson.optional).length}</td>
                                                                   <td className="py-3 pr-4">{student.bestCourseQuizAttempt ? `${student.bestCourseQuizAttempt.percentScore}%` : "-"}</td>
                                                                   <td className="py-3">{student.portfolioReportGeneratedAt ? new Date(student.portfolioReportGeneratedAt).toLocaleString() : "-"}</td>
                                                               </tr>
                                                           ))}
                                                       </tbody>
                                                   </table>
                                               </div>
                                           )}
                                       </div>

                                       <div className="bg-[var(--neutral-200)] p-6 rounded-2xl shadow">
                                           <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Course rollup</h3>
                                           <div className="space-y-3 text-sm text-[var(--foreground)]">
                                               <div className="flex justify-between gap-4"><span>Average completed lessons</span><span>{averageCompletedLessons.toFixed(1)}</span></div>
                                               <div className="flex justify-between gap-4"><span>Average best course quiz</span><span>{Number.isFinite(averageBestCourseQuiz) ? `${averageBestCourseQuiz.toFixed(1)}%` : "-"}</span></div>
                                               <div className="flex justify-between gap-4"><span>Invitations created</span><span>{analyticsData.invitations.length}</span></div>
                                           </div>
                                           <div className="mt-6 space-y-3">
                                               {lessonRollup.map(({ lesson, started, completed }) => (
                                                   <div key={lesson.id} className="rounded-xl border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-3">
                                                       <div className="flex items-center justify-between gap-4 text-sm">
                                                           <span className="font-medium">Lesson {lesson.index + 1}: {lesson.title}</span>
                                                           <span className="text-[var(--neutral-600)]">{completed} complete / {started} started</span>
                                                       </div>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   </div>

                                   <div className="mt-10 space-y-8">
                                       <h2 className="text-2xl font-semibold text-[var(--foreground)]">Learning insights</h2>
                                       <p className="text-sm text-[var(--neutral-600)] -mt-4">Aggregated from quiz attempts and lesson progress (attempts must include this course ID).</p>

                                       {analyticsData.rollups.lessonTiming.length > 0 && (
                                           <div className="bg-[var(--neutral-200)] p-6 rounded-2xl shadow">
                                               <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">Time to complete</h3>
                                               <p className="text-sm text-[var(--neutral-600)] mb-4">Median time from first lesson activity to completion (students who completed).</p>
                                               <div className="overflow-x-auto">
                                                   <table className="w-full text-sm">
                                                       <thead>
                                                           <tr className="text-left border-b border-[var(--neutral-300)]">
                                                               <th className="py-2 pr-4">Lesson</th>
                                                               <th className="py-2 pr-4">Started</th>
                                                               <th className="py-2 pr-4">Completed</th>
                                                               <th className="py-2">Median duration</th>
                                                           </tr>
                                                       </thead>
                                                       <tbody>
                                                           {analyticsData.rollups.lessonTiming.map((row) => (
                                                               <tr key={row.lessonId} className="border-b border-[var(--neutral-300)]">
                                                                   <td className="py-3 pr-4 font-medium text-[var(--foreground)]">Lesson {row.lessonIndex + 1}: {row.lessonTitle}</td>
                                                                   <td className="py-3 pr-4">{row.startedCount}</td>
                                                                   <td className="py-3 pr-4">{row.completedCount}</td>
                                                                   <td className="py-3">{formatDurationMs(row.medianMsToComplete)}</td>
                                                               </tr>
                                                           ))}
                                                       </tbody>
                                                   </table>
                                               </div>
                                           </div>
                                       )}

                                       {analyticsData.rollups.quizzes.filter((q) => q.totalAttempts > 0).length > 0 && (
                                           <div className="bg-[var(--neutral-200)] p-6 rounded-2xl shadow space-y-6">
                                               <h3 className="text-xl font-semibold text-[var(--foreground)]">Quiz questions</h3>
                                               <p className="text-sm text-[var(--neutral-600)]">Wrong rate is incorrect answers divided by attempts that reached that question.</p>
                                               {analyticsData.rollups.quizzes.filter((q) => q.totalAttempts > 0).map((quiz) => {
                                                   const lesson = quiz.lessonId ? sortedLessons.find((l) => l.id === quiz.lessonId) : null;
                                                   const sortedQs = [...quiz.questionStats].filter((s) => s.attemptCount > 0).sort((a, b) => b.wrongPercent - a.wrongPercent);
                                                   return (
                                                       <div key={quiz.quizId} className="rounded-xl border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-4">
                                                           <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                                                               <div className="font-semibold text-[var(--foreground)]">{quiz.title}</div>
                                                               <div className="text-xs text-[var(--neutral-600)]">
                                                                   {quiz.totalAttempts} attempts · {quiz.distinctStudents} students
                                                                   {quiz.medianElapsedMs != null ? ` · median ${formatDurationMs(quiz.medianElapsedMs)}` : ""}
                                                                   {lesson ? ` · ${lesson.title}` : ""}
                                                               </div>
                                                           </div>
                                                           {sortedQs.length === 0 ? (
                                                               <p className="text-sm text-[var(--neutral-600)]">No per-question data.</p>
                                                           ) : (
                                                               <div className="overflow-x-auto">
                                                                   <table className="w-full text-sm">
                                                                       <thead>
                                                                           <tr className="text-left border-b border-[var(--neutral-300)]">
                                                                               <th className="py-2 pr-3">#</th>
                                                                               <th className="py-2 pr-3">Question</th>
                                                                               <th className="py-2 pr-3">Wrong rate</th>
                                                                               <th className="py-2">Attempts</th>
                                                                           </tr>
                                                                       </thead>
                                                                       <tbody>
                                                                           {sortedQs.map((s) => (
                                                                               <tr key={s.questionIndex} className="border-b border-[var(--neutral-300)] align-top">
                                                                                   <td className="py-2 pr-3 text-[var(--neutral-600)]">{s.questionIndex + 1}</td>
                                                                                   <td className="py-2 pr-3 text-[var(--foreground)]">{s.questionSnippet}</td>
                                                                                   <td className="py-2 pr-3">{s.wrongPercent}%</td>
                                                                                   <td className="py-2">{s.attemptCount}</td>
                                                                               </tr>
                                                                           ))}
                                                                       </tbody>
                                                                   </table>
                                                               </div>
                                                           )}
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       )}

                                       {sortedLessons.some((lesson) => (analyticsData.rollups.unlocksByLesson[lesson.id] || []).length > 0) && (
                                           <div className="bg-[var(--neutral-200)] p-6 rounded-2xl shadow space-y-6">
                                               <h3 className="text-xl font-semibold text-[var(--foreground)]">Unlock cards</h3>
                                               <p className="text-sm text-[var(--neutral-600)]">How many students who started the lesson unlocked each template card.</p>
                                               {sortedLessons.map((lesson) => {
                                                   const slots = analyticsData.rollups.unlocksByLesson[lesson.id];
                                                   if (!slots?.length) return null;
                                                   return (
                                                       <div key={lesson.id} className="rounded-xl border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-4">
                                                           <div className="font-semibold text-[var(--foreground)] mb-3">Lesson {lesson.index + 1}: {lesson.title}</div>
                                                           <div className="overflow-x-auto">
                                                               <table className="w-full text-sm">
                                                                   <thead>
                                                                       <tr className="text-left border-b border-[var(--neutral-300)]">
                                                                           <th className="py-2 pr-3">Card</th>
                                                                           <th className="py-2 pr-3">Unlocked</th>
                                                                           <th className="py-2">Started lesson</th>
                                                                       </tr>
                                                                   </thead>
                                                                   <tbody>
                                                                       {slots.map((slot) => (
                                                                           <tr key={slot.cardId} className="border-b border-[var(--neutral-300)]">
                                                                               <td className="py-2 pr-3 text-[var(--foreground)]">{slot.title}</td>
                                                                               <td className="py-2 pr-3">{slot.unlockedByCount}</td>
                                                                               <td className="py-2">{slot.studentsStartedLesson}</td>
                                                                           </tr>
                                                                       ))}
                                                                   </tbody>
                                                               </table>
                                                           </div>
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       )}
                                   </div>
                               </>
                           )}

                           {activeView === "invites" && (
                               <div className="bg-[var(--neutral-200)] p-6 rounded-2xl shadow">
                                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Invitations</h3>
                                  {analyticsData.invitations.length === 0 ? (
                                      <p className="text-[var(--neutral-600)]">No invitations created yet.</p>
                                  ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {analyticsData.invitations.map((invitation, index) => (
                                              <div key={index} className="border border-[var(--neutral-300)] rounded-2xl p-4 bg-[var(--neutral-100)]">
                                                  <div className="flex justify-between items-start gap-4 mb-3">
                                                      <div>
                                                          <p className="text-[var(--foreground)] font-medium break-all">{invitation.token}</p>
                                                          <p className="text-sm text-[var(--neutral-600)]">Created: {new Date(invitation.createdAt).toLocaleDateString()}</p>
                                                      </div>
                                                      <button
                                                          onClick={() => {
                                                              navigator.clipboard.writeText(`${window.location.origin}/i?token=${invitation.token}`);
                                                              setCopiedToken(invitation.token);
                                                              setTimeout(() => setCopiedToken(null), 2000);
                                                          }}
                                                          className="inline-flex items-center gap-2 bg-[var(--accent-500)] text-white px-3 py-2 rounded-lg hover:bg-[var(--accent-600)]"
                                                      >
                                                          <FiCopy />
                                                          {copiedToken === invitation.token ? "Copied" : "Copy Link"}
                                                      </button>
                                                  </div>
                                                  <div>
                                                      <p className="text-sm text-[var(--foreground)] mb-2">Accepted by ({invitation.acceptedBy.length})</p>
                                                      {invitation.acceptedBy.length === 0 ? (
                                                          <p className="text-sm text-[var(--neutral-600)]">None yet.</p>
                                                      ) : (
                                                          <div className="space-y-2 text-sm text-[var(--neutral-600)]">
                                                              {invitation.acceptedBy.map((user, idx) => (
                                                                  <div key={idx} className="rounded-lg bg-[var(--neutral-200)] px-3 py-2">{user.displayName || user.email || user.id}</div>
                                                              ))}
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                           )}

                           {activeView === "students" && (
                               <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
                                   <div className="bg-[var(--neutral-200)] p-4 rounded-2xl shadow">
                                       <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Students</h3>
                                       <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                                           {analyticsData.students.map((student) => {
                                               const isSelected = student.userId === selectedStudentId;
                                               return (
                                                   <button
                                                       key={student.userId}
                                                       className={`w-full text-left rounded-xl border px-4 py-3 transition ${isSelected ? "border-[var(--accent-500)] bg-[var(--accent-500)]/10" : "border-[var(--neutral-300)] bg-[var(--neutral-100)] hover:bg-[var(--neutral-200)]"}`}
                                                       onClick={() => setSelectedStudentId(student.userId)}
                                                   >
                                                       <div className="font-medium text-[var(--foreground)]">{formatStudentName(student)}</div>
                                                       <div className="text-xs text-[var(--neutral-600)] mt-1">{student.completedLessonsCount || 0} lessons complete</div>
                                                       <div className="text-xs text-[var(--neutral-600)]">{student.bestCourseQuizAttempt ? `Best course quiz ${student.bestCourseQuizAttempt.percentScore}%` : "No course quiz attempts"}</div>
                                                   </button>
                                               );
                                           })}
                                       </div>
                                   </div>

                                   <div className="bg-[var(--neutral-200)] p-6 rounded-2xl shadow min-h-[60vh]">
                                       {!selectedStudent ? (
                                           <p className="text-[var(--neutral-600)]">Select a student to view detailed analytics.</p>
                                       ) : (
                                           <div className="space-y-6">
                                               <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                   <div>
                                                       <h3 className="text-2xl font-semibold text-[var(--foreground)]">{formatStudentName(selectedStudent)}</h3>
                                                       {selectedStudent.email && <p className="text-[var(--neutral-600)]">{selectedStudent.email}</p>}
                                                   </div>
                                                   <div className="flex flex-wrap gap-3">
                                                       <Button color="var(--neutral-300)" onClick={refreshSelectedStudentReports}>
                                                           <span className="inline-flex items-center gap-2"><FiRefreshCw /> Refresh</span>
                                                       </Button>
                                                       <Button color="var(--accent-500)" disabled={studentReportGenerating || studentReportsLoading} onClick={generateStudentReport}>
                                                           <span className="inline-flex items-center gap-2"><FiFileText /> {studentReportGenerating ? "Generating…" : "Generate report"}</span>
                                                       </Button>
                                                   </div>
                                               </div>

                                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                   <div className="rounded-2xl bg-[var(--neutral-100)] p-4 border border-[var(--neutral-300)]">
                                                       <p className="text-sm text-[var(--neutral-600)] mb-1">Required lessons complete</p>
                                                       <p className="text-2xl font-bold text-[var(--accent-500)]">{selectedStudent.completedLessonsCount || 0}/{sortedLessons.filter((lesson) => !lesson.optional).length}</p>
                                                   </div>
                                                   <div className="rounded-2xl bg-[var(--neutral-100)] p-4 border border-[var(--neutral-300)]">
                                                       <p className="text-sm text-[var(--neutral-600)] mb-1">Latest course quiz</p>
                                                       <p className="text-2xl font-bold text-[var(--accent-500)]">{selectedStudent.latestCourseQuizAttempt ? `${selectedStudent.latestCourseQuizAttempt.percentScore}%` : "-"}</p>
                                                   </div>
                                                   <div className="rounded-2xl bg-[var(--neutral-100)] p-4 border border-[var(--neutral-300)]">
                                                       <p className="text-sm text-[var(--neutral-600)] mb-1">Best course quiz</p>
                                                       <p className="text-2xl font-bold text-[var(--accent-500)]">{selectedStudent.bestCourseQuizAttempt ? `${selectedStudent.bestCourseQuizAttempt.percentScore}%` : "-"}</p>
                                                   </div>
                                               </div>

                                               <div className="grid grid-cols-1 2xl:grid-cols-[1.1fr_0.9fr] gap-6">
                                                   <div className="rounded-2xl bg-[var(--neutral-100)] p-5 border border-[var(--neutral-300)]">
                                                       <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4">Lesson detail</h4>
                                                       <div className="space-y-3">
                                                           {sortedLessons.map((lesson) => {
                                                               const entry = selectedStudent.lessonProgress?.[lesson.id];
                                                               return (
                                                                   <div key={lesson.id} className="rounded-xl border border-[var(--neutral-300)] p-4">
                                                                       <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                                                           <div className="font-medium text-[var(--foreground)]">Lesson {lesson.index + 1}: {lesson.title}</div>
                                                                           <div className="text-sm text-[var(--neutral-600)]">{entry?.completedAt ? "Completed" : entry ? "In progress" : "Not started"}</div>
                                                                       </div>
                                                                       <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-[var(--neutral-600)]">
                                                                           <div>Projects: {entry?.projectIds?.length || 0}</div>
                                                                           <div>Unlocked cards: {Math.max(entry?.unlockedCardIds?.length || 0, entry?.derivedUnlockSlotCount || 0)}/{lesson.cardsToUnlock.length}</div>
                                                                           <div>Best lesson quiz: {entry?.bestQuizAttempt ? `${entry.bestQuizAttempt.percentScore}%` : "-"}</div>
                                                                       </div>
                                                                   </div>
                                                               );
                                                           })}
                                                       </div>
                                                   </div>

                                                   <div className="rounded-2xl bg-[var(--neutral-100)] p-5 border border-[var(--neutral-300)]">
                                                       <div className="flex items-center justify-between gap-4 mb-4">
                                                           <h4 className="text-lg font-semibold text-[var(--foreground)]">Portfolio reports</h4>
                                                           {studentReportsLoading && <span className="text-sm text-[var(--neutral-600)]">Loading…</span>}
                                                       </div>

                                                       <div className="mb-4 rounded-xl border border-[var(--neutral-300)] p-4 bg-[var(--neutral-200)]">
                                                           <p className="text-sm font-medium text-[var(--foreground)] mb-2">Report eligibility</p>
                                                           <p className="text-sm text-[var(--neutral-600)] mb-2">{studentReportState?.eligible ? "Eligible to generate a report." : "Not yet eligible to generate a report."}</p>
                                                           {!studentReportState?.eligible && studentReportState?.eligibilityReasons?.length ? (
                                                               <div className="space-y-1 text-sm text-[var(--neutral-600)]">
                                                                   {studentReportState.eligibilityReasons.map((reason, index) => (
                                                                       <div key={index}>{reason}</div>
                                                                   ))}
                                                               </div>
                                                           ) : null}
                                                       </div>

                                                       {studentReportState?.reports.length ? (
                                                           <div className="space-y-3">
                                                               {studentReportState.reports.map((report) => (
                                                                   <div key={report.id} className="rounded-xl border border-[var(--neutral-300)] p-4">
                                                                       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                                           <div>
                                                                               <div className="font-medium text-[var(--foreground)]">{new Date(report.generatedAt).toLocaleString()}</div>
                                                                               <div className="text-xs text-[var(--neutral-600)]">Report ID: {report.id}</div>
                                                                           </div>
                                                                           <div className="flex flex-wrap gap-2">
                                                                               <Button color="var(--accent-500)" onClick={() => openReport(report.id)}>
                                                                                   <span className="inline-flex items-center gap-2"><FiFileText /> View</span>
                                                                               </Button>
                                                                               <Button color="var(--neutral-300)" onClick={async () => {
                                                                                   const data = await getPortfolioReportStatus(courseId, { studentId: selectedStudent.userId, reportId: report.id });
                                                                                   if (data.selectedReport) {
                                                                                       downloadMarkdown(data.selectedReport.markdown, `portfolio-${selectedStudent.userId.slice(0, 8)}-${report.id.slice(0, 8)}.md`);
                                                                                   }
                                                                               }}>
                                                                                   <span className="inline-flex items-center gap-2"><FiDownload /> Download</span>
                                                                               </Button>
                                                                           </div>
                                                                       </div>
                                                                   </div>
                                                               ))}
                                                           </div>
                                                       ) : (
                                                           <p className="text-sm text-[var(--neutral-600)]">No generated reports yet.</p>
                                                       )}
                                                   </div>
                                               </div>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           )}
                </>
            </div>

            <Modal
                isOpen={!!reportModal || reportModalLoading}
                type="empty"
                width="4xl"
                title={reportModal ? `Portfolio Report • ${new Date(reportModal.generatedAt).toLocaleString()}` : "Loading report"}
                onClose={() => setReportModal(null)}
            >
                {reportModalLoading ? (
                    <div className="py-10 text-center text-[var(--neutral-600)]">Loading report…</div>
                ) : reportModal ? (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button color="var(--accent-500)" onClick={() => downloadMarkdown(reportModal.markdown, `portfolio-${selectedStudentId?.slice(0, 8) || "student"}-${reportModal.id.slice(0, 8)}.md`)}>
                                <span className="inline-flex items-center gap-2"><FiDownload /> Download .md</span>
                            </Button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] p-4 prose prose-sm dark:prose-invert max-w-none">
                            <MarkdownArticle markdown={reportModal.markdown} />
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

export default Analytics;
