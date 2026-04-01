"use client";

import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiBarChart2, FiBookOpen, FiCopy, FiDownload, FiFileText, FiRefreshCw, FiSettings, FiUsers } from "react-icons/fi";
import { getCourse, fetchAnalytics, getPortfolioReportStatus, regeneratePortfolioReport } from "../../../views/courses";
import { Course, CoursePortfolioReportSummary, CourseStudentProgress } from "@/lib/types/course";
import Button from "../../button";
import Modal from "../../modal";
import MarkdownArticle from "../../md";

interface AnalyticsProps {
    courseId: string;
}

const Analytics = ({ courseId }: AnalyticsProps) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [analyticsData, setAnalyticsData] = useState({
        totalUsers: 0,
        invitations: [] as { token: string; createdAt: string; createdBy?: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[],
        students: [] as CourseStudentProgress[],
    });
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<"course" | "invites" | "students">("course");
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
    const tabButtonClass = (view: "course" | "invites" | "students") => `rounded-full px-4 py-2 text-sm font-medium transition ${activeView === view ? "bg-[var(--accent-500)] text-white" : "bg-[var(--neutral-200)] text-[var(--foreground)] hover:bg-[var(--neutral-300)]"}`;

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                const data = await fetchAnalytics(courseId);
                if (data) {
                    setAnalyticsData(data);
                } else {
                    console.error("Failed to fetch analytics");
                    // Keep placeholder data
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
                // Keep placeholder data
            }
        };

        if (courseId) {
            fetchAnalyticsData();
        }
    }, [courseId]);

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
                    <button className={tabButtonClass("course")} onClick={() => setActiveView("course")}><FiBarChart2 className="inline mr-2" />Course</button>
                    <button className={tabButtonClass("invites")} onClick={() => setActiveView("invites")}><FiBookOpen className="inline mr-2" />Invites</button>
                    <button className={tabButtonClass("students")} onClick={() => setActiveView("students")}><FiUsers className="inline mr-2" />Students</button>
                </div>

                 {course?.public ? (
                      <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow text-center">
                          <p className="text-[var(--neutral-600)]">Analytics are not yet available for public courses.</p>
                      </div>
                  ) : (
                      <>
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
                                                                           <div>Unlocked cards: {entry?.unlockedCardIds?.length || 0}/{lesson.cardsToUnlock.length}</div>
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
                  )}
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
