"use client";

import { FiLoader, FiFileText } from "react-icons/fi";

import Button from "@/app/components/button";
import { regeneratePortfolioReport } from "@/app/views/courses";
import { Quiz } from "@/lib/types/quiz";

type CourseQuizzesPortfolioSectionProps = {
    courseQuizzes: Quiz[];
    courseId: string;
    portfolioStatus: {
        eligible: boolean;
        eligibilityReasons: string[];
        report: { markdown: string; generatedAt: string; id: string } | null;
    } | null;
    portfolioStatusLoading: boolean;
    portfolioRefreshing: boolean;
    setPortfolioStatus: React.Dispatch<
        React.SetStateAction<{
            eligible: boolean;
            eligibilityReasons: string[];
            report: { markdown: string; generatedAt: string; id: string } | null;
        } | null>
    >;
    setPortfolioRefreshing: React.Dispatch<React.SetStateAction<boolean>>;
    onOpenPortfolioPreview: () => void;
};

/** Flex row shrink-wrapped to content; quiz/report slots are flex-none so neither column steals free space. */
export default function CourseQuizzesPortfolioSection({
    courseQuizzes,
    courseId,
    portfolioStatus,
    portfolioStatusLoading,
    portfolioRefreshing,
    setPortfolioStatus,
    setPortfolioRefreshing,
    onOpenPortfolioPreview,
}: CourseQuizzesPortfolioSectionProps) {
    const rowStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: "2rem",
        width: "max-content",
        maxWidth: "100%",
        boxSizing: "border-box",
        textAlign: "left",
    };

    const quizSlotStyle: React.CSSProperties = {
        flex: "0 0 auto",
        width: "max-content",
        maxWidth: "100%",
        minWidth: 0,
    };

    const dividerStyle: React.CSSProperties = {
        flex: "0 0 1px",
        width: 1,
        alignSelf: "stretch",
        minHeight: "10rem",
        backgroundColor: "var(--neutral-300)",
    };

    const reportSlotStyle: React.CSSProperties = {
        flex: "0 0 20rem",
        width: "20rem",
        maxWidth: "20rem",
        minWidth: "20rem",
    };

    return (
        <section
            className="mb-8 w-full min-w-0 overflow-x-auto pb-2"
            style={{ textAlign: "left" }}
            aria-label="Course quizzes and portfolio report"
        >
            <div style={rowStyle}>
                <div style={quizSlotStyle}>
                    <h2 className="mb-4 text-2xl font-semibold text-[var(--foreground)]">Course quizzes</h2>
                    <div className="flex flex-row flex-nowrap gap-4">
                        {courseQuizzes.length > 0 ? (
                            courseQuizzes.map((quiz) => (
                                <div
                                    key={quiz.id}
                                    className="flex w-80 shrink-0 flex-col rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-200)] p-4 shadow"
                                >
                                    <h3 className="mb-2 text-lg font-medium text-[var(--foreground)]">{quiz.title}</h3>
                                    <p className="mb-2 text-sm text-[var(--neutral-600)]">{quiz.description}</p>
                                    {(quiz.latestAttempt || quiz.bestAttempt) && (
                                        <div className="mb-3 text-sm text-[var(--neutral-600)]">
                                            {quiz.latestAttempt && (
                                                <p>
                                                    Latest: {quiz.latestAttempt.totalScore}/{quiz.latestAttempt.maxScore} (
                                                    {quiz.latestAttempt.percentScore}%)
                                                </p>
                                            )}
                                            {quiz.bestAttempt && (
                                                <p>
                                                    Best: {quiz.bestAttempt.totalScore}/{quiz.bestAttempt.maxScore} (
                                                    {quiz.bestAttempt.percentScore}%)
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <Button color="var(--accent-500)" onClick={() => window.open(`/quiz/${quiz.id}`, "_blank")}>
                                        Take quiz
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="flex w-80 shrink-0 flex-col justify-center rounded-lg border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-200)]/80 p-4 text-sm text-[var(--neutral-600)]">
                                No course-level quizzes on this course.
                            </div>
                        )}
                    </div>
                </div>

                <div aria-hidden style={dividerStyle} />

                <div style={reportSlotStyle}>
                    <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-[var(--foreground)]">
                        Portfolio report
                        {portfolioStatusLoading && (
                            <FiLoader className="size-5 shrink-0 animate-spin text-[var(--accent-500)]" aria-hidden />
                        )}
                    </h2>
                    <div className="flex flex-col rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-200)] p-4 shadow">
                        <p className="mb-3 text-xs leading-snug text-[var(--neutral-600)]">
                            Auto-generated summary of your work (third-person, for instructors). Refresh after new activity.
                        </p>

                        {portfolioStatusLoading && (
                            <div className="flex flex-col gap-2 py-2" aria-busy="true" aria-label="Loading portfolio status">
                                <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--neutral-300)]" />
                                <div className="h-3 w-full animate-pulse rounded bg-[var(--neutral-300)]" />
                                <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--neutral-300)]" />
                            </div>
                        )}

                        {!portfolioStatusLoading && !portfolioStatus && (
                            <p className="text-sm text-[var(--neutral-600)]">
                                Couldn&apos;t load portfolio status. Try refreshing the page.
                            </p>
                        )}

                        {!portfolioStatusLoading && portfolioStatus && !portfolioStatus.eligible && (
                            <div className="space-y-2 text-sm text-[var(--neutral-600)]">
                                <p className="font-medium text-[var(--foreground)]">Not eligible yet</p>
                                <p className="text-xs">Complete required lessons and quiz rules to unlock your report.</p>
                                {portfolioStatus.eligibilityReasons.length > 0 && (
                                    <ul className="max-h-28 list-disc space-y-1 overflow-y-auto pl-4 text-xs">
                                        {portfolioStatus.eligibilityReasons.map((r, i) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {!portfolioStatusLoading && portfolioStatus?.eligible && (
                            <div className="flex flex-col gap-3">
                                <div className="space-y-1 text-xs text-[var(--neutral-600)]">
                                    <p>
                                        <span className="font-semibold text-[var(--foreground)]">Status: </span>
                                        {portfolioStatus.report ? "Report ready" : "No report generated yet"}
                                    </p>
                                    {portfolioStatus.report && (
                                        <p className="text-[var(--neutral-500)]">
                                            Updated {new Date(portfolioStatus.report.generatedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        color="var(--accent-500)"
                                        disabled={portfolioRefreshing}
                                        onClick={async () => {
                                            setPortfolioRefreshing(true);
                                            try {
                                                const r = await regeneratePortfolioReport(courseId);
                                                setPortfolioStatus((prev) =>
                                                    prev
                                                        ? {
                                                              ...prev,
                                                              report: {
                                                                  markdown: r.markdown,
                                                                  generatedAt: r.generatedAt,
                                                                  id: r.id,
                                                              },
                                                          }
                                                        : prev,
                                                );
                                            } catch (e) {
                                                console.error(e);
                                                alert((e as Error).message);
                                            } finally {
                                                setPortfolioRefreshing(false);
                                            }
                                        }}
                                    >
                                        {portfolioRefreshing ? (
                                            <span className="inline-flex items-center justify-center gap-2">
                                                <FiLoader className="size-4 animate-spin" aria-hidden />
                                                Generating…
                                            </span>
                                        ) : portfolioStatus.report ? (
                                            "Regenerate"
                                        ) : (
                                            "Generate report"
                                        )}
                                    </Button>
                                    {portfolioStatus.report && (
                                        <>
                                            <Button color="var(--neutral-300)" onClick={onOpenPortfolioPreview}>
                                                <span className="inline-flex items-center justify-center gap-2">
                                                    <FiFileText className="size-4" aria-hidden />
                                                    Preview full report
                                                </span>
                                            </Button>
                                            <button
                                                type="button"
                                                className="text-left text-xs font-semibold text-[var(--accent-600)] hover:underline"
                                                onClick={() => {
                                                    const blob = new Blob([portfolioStatus.report!.markdown], {
                                                        type: "text/markdown;charset=utf-8",
                                                    });
                                                    const a = document.createElement("a");
                                                    a.href = URL.createObjectURL(blob);
                                                    a.download = `portfolio-${courseId.slice(0, 8)}.md`;
                                                    a.click();
                                                    URL.revokeObjectURL(a.href);
                                                }}
                                            >
                                                Download .md
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
