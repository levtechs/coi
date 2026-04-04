import { adminDb } from "@/lib/firebaseAdmin";
import { CourseStudentProgress } from "@/lib/types/course";
import { CourseAnalyticsRollups } from "@/lib/types/course_analytics";
import { Message } from "@/lib/types/chat";

/** Max JSON chars sent to the overview model (excludes system framing). */
const MAX_METRICS_JSON = 12_000;
/** Per-learner user messages from tutor chats */
const MAX_MESSAGES_PER_LEARNER = 8;
const MAX_MESSAGE_CHARS = 200;
const MAX_LEARNERS_WITH_CHATS = 24;
const MAX_TOTAL_CHAT_CHARS = 4_000;

export function courseHasAnalyticsProgress(students: CourseStudentProgress[], rollups: CourseAnalyticsRollups): boolean {
    if (students.length === 0) return false;
    if (students.some((s) => Object.keys(s.lessonProgress || {}).length > 0)) return true;
    if (rollups.quizzes.some((q) => q.totalAttempts > 0)) return true;
    if (rollups.lessonTiming.some((l) => l.startedCount > 0)) return true;
    return false;
}

function clip(s: string, max: number): string {
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…`;
}

/**
 * Compact rollups + tiny student summary for LLM (deterministic, bounded size).
 */
export function buildCompactMetricsPayload(
    courseTitle: string,
    students: CourseStudentProgress[],
    rollups: CourseAnalyticsRollups,
): string {
    const studentSummary = students.slice(0, 40).map((s) => ({
        id: s.userId.slice(0, 8),
        lessonsComplete: s.completedLessonsCount ?? 0,
        bestCourseQuiz: s.bestCourseQuizAttempt?.percentScore ?? null,
    }));

    const quizzes = rollups.quizzes
        .filter((q) => q.totalAttempts > 0)
        .slice(0, 12)
        .map((q) => ({
            title: clip(q.title, 80),
            attempts: q.totalAttempts,
            students: q.distinctStudents,
            topWeak: q.questionStats
                .filter((s) => s.attemptCount > 0)
                .sort((a, b) => b.wrongPercent - a.wrongPercent)
                .slice(0, 3)
                .map((s) => ({
                    q: clip(s.questionSnippet, 100),
                    wrongPct: s.wrongPercent,
                    n: s.attemptCount,
                })),
        }));

    const timing = rollups.lessonTiming.map((t) => ({
        lesson: clip(t.lessonTitle, 60),
        started: t.startedCount,
        done: t.completedCount,
    }));

    const unlocks = Object.entries(rollups.unlocksByLesson).slice(0, 8).map(([lessonId, slots]) => ({
        lessonId: lessonId.slice(0, 8),
        slots: slots.slice(0, 6).map((sl) => ({
            card: clip(sl.title, 60),
            unlocked: sl.unlockedByCount,
            of: sl.studentsStartedLesson,
        })),
    }));

    const payload = {
        courseTitle: clip(courseTitle, 120),
        learnerCount: students.length,
        studentSummary,
        quizzes,
        lessonTiming: timing,
        unlocksByLesson: unlocks,
    };

    let json = JSON.stringify(payload);
    if (json.length > MAX_METRICS_JSON) {
        json = json.slice(0, MAX_METRICS_JSON) + "\n…[truncated]";
    }
    return json;
}

/**
 * Sample learner questions from lesson project chats (Admin SDK only).
 */
export async function collectLearnerQuestionSamples(courseId: string, studentIds: Set<string>): Promise<string[]> {
    if (studentIds.size === 0) return [];

    const projectsSnap = await adminDb.collection("projects").where("courseId", "==", courseId).get();
    const lines: string[] = [];
    let totalChars = 0;

    const ownersToVisit = projectsSnap.docs
        .map((d) => ({ id: d.id, ownerId: d.data().ownerId as string | undefined }))
        .filter((p): p is { id: string; ownerId: string } => !!p.ownerId && studentIds.has(p.ownerId))
        .slice(0, MAX_LEARNERS_WITH_CHATS);

    for (const { id: projectId, ownerId } of ownersToVisit) {
        if (totalChars >= MAX_TOTAL_CHAT_CHARS) break;
        const chatSnap = await adminDb.collection("projects").doc(projectId).collection("chats").doc(ownerId).get();
        if (!chatSnap.exists) continue;
        const messages = (chatSnap.data()?.messages || []) as Message[];
        const userMsgs = messages.filter((m) => m && !m.isResponse && typeof m.content === "string" && m.content.trim());
        const take = userMsgs.slice(-MAX_MESSAGES_PER_LEARNER);
        for (const m of take) {
            const text = clip(m.content.replace(/\s+/g, " ").trim(), MAX_MESSAGE_CHARS);
            if (text.length < 8) continue;
            const line = `- (${ownerId.slice(0, 6)}…): ${text}`;
            if (totalChars + line.length > MAX_TOTAL_CHAT_CHARS) break;
            lines.push(line);
            totalChars += line.length + 1;
        }
    }

    return lines;
}

export function buildLearnerQuestionsBlock(samples: string[]): string {
    if (samples.length === 0) return "(No sampled learner questions from tutor chats.)";
    return samples.join("\n");
}

export function continuityFromPreviousReports(reports: { markdown: string }[]): string {
    if (reports.length === 0) return "";
    const combined = reports.map((r) => r.markdown).join("\n\n---\n\n");
    return clip(combined, 2_500);
}
