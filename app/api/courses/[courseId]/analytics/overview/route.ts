import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getVerifiedUid } from "@/app/api/helpers";
import { isCourseStaff } from "@/app/api/courses/helpers";
import { loadCourseAnalyticsBundle } from "@/app/api/courses/[courseId]/analytics/load_bundle";
import {
    buildCompactMetricsPayload,
    buildLearnerQuestionsBlock,
    collectLearnerQuestionSamples,
    continuityFromPreviousReports,
    courseHasAnalyticsProgress,
} from "@/app/api/courses/[courseId]/analytics/overview_payload";
import { generateCourseAnalyticsOverviewMarkdown } from "@/app/api/courses/[courseId]/analytics/generate_overview";
import {
    fetchCourseAnalyticsOverviewById,
    fetchRecentCourseAnalyticsOverviews,
    saveCourseAnalyticsOverview,
} from "@/app/api/courses/[courseId]/analytics/overview_storage";

const CACHE_TTL_MS = 45 * 60 * 1000;

function parseTime(iso: string): number {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : 0;
}

async function assertStaff(courseId: string, uid: string) {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
        return { error: NextResponse.json({ error: "Course not found" }, { status: 404 }) };
    }
    const courseData = courseSnap.data();
    if (!courseData || !isCourseStaff(courseData, uid)) {
        return { error: NextResponse.json({ error: "Only course staff can view analytics overview" }, { status: 403 }) };
    }
    return { courseSnap };
}

/**
 * GET: latest overview + short history, or single report by ?reportId=
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 401 });

    const { courseId } = await params;
    const reportId = req.nextUrl.searchParams.get("reportId")?.trim();

    try {
        const gate = await assertStaff(courseId, uid);
        if ("error" in gate) return gate.error;

        if (reportId) {
            const report = await fetchCourseAnalyticsOverviewById(courseId, reportId);
            if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
            return NextResponse.json({ report });
        }

        const recent = await fetchRecentCourseAnalyticsOverviews(courseId, 25);
        const latest = recent[0] || null;
        const history = recent.map((r) => ({ id: r.id, generatedAt: r.generatedAt }));

        return NextResponse.json({ latest, history });
    } catch (err) {
        console.error("GET analytics overview:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

/**
 * POST: ensure or regenerate overview. Body: { force?: boolean }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 401 });

    const { courseId } = await params;

    let force = false;
    try {
        const body = await req.json();
        force = body?.force === true;
    } catch {
        /* empty body */
    }

    try {
        const gate = await assertStaff(courseId, uid);
        if ("error" in gate) return gate.error;

        const { students, course, rollups } = await loadCourseAnalyticsBundle(courseId);

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        if (!courseHasAnalyticsProgress(students, rollups)) {
            return NextResponse.json(
                { error: "No learner progress yet", code: "no_progress" },
                { status: 400 },
            );
        }

        const recent = await fetchRecentCourseAnalyticsOverviews(courseId, 3);
        const newest = recent[0];

        if (!force && newest) {
            const age = Date.now() - parseTime(newest.generatedAt);
            if (age >= 0 && age < CACHE_TTL_MS) {
                return NextResponse.json({
                    id: newest.id,
                    generatedAt: newest.generatedAt,
                    markdown: newest.markdown,
                    cached: true,
                });
            }
        }

        const metricsJson = buildCompactMetricsPayload(course.title, students, rollups);
        const studentIdSet = new Set(students.map((s) => s.userId));
        const samples = await collectLearnerQuestionSamples(courseId, studentIdSet);
        const learnerQuestionsBlock = buildLearnerQuestionsBlock(samples);

        const previousContinuity = continuityFromPreviousReports(recent.slice(0, 2));

        const markdown = await generateCourseAnalyticsOverviewMarkdown({
            courseTitle: course.title,
            metricsJson,
            learnerQuestionsBlock,
            previousOverviewContinuity: previousContinuity,
        });

        const { id, generatedAt } = await saveCourseAnalyticsOverview(courseId, markdown);

        return NextResponse.json({
            id,
            generatedAt,
            markdown,
            cached: false,
        });
    } catch (err) {
        console.error("POST analytics overview:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
