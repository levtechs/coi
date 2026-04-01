import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getVerifiedUid } from "@/app/api/helpers";
import { canAccessCourse, isCourseStaff } from "@/app/api/courses/helpers";
import { fetchCourseAndLessonContext } from "@/app/api/courses/helpers";
import {
  fetchPortfolioReportById,
  fetchPortfolioReports,
  fetchCourseStudentProgressForUser,
  fetchLatestPortfolioReport,
  savePortfolioReport,
} from "@/app/api/courses/progress_helpers";
import { isCourseCompletedForReport } from "@/app/api/courses/report_completion";
import { aggregatePortfolioInput } from "./aggregate";
import { generatePortfolioMarkdown } from "./generate_markdown";

/**
 * GET: eligibility + latest saved report, with optional staff access for a student's history.
 * POST: regenerate report when eligible for self or, for course staff, a student.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const uid = await getVerifiedUid(req);
    const { courseId } = await params;
    const targetUid = req.nextUrl.searchParams.get("studentId")?.trim() || uid;
    const reportId = req.nextUrl.searchParams.get("reportId")?.trim();
    const includeHistory = req.nextUrl.searchParams.get("includeHistory") === "1";
    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const courseData = courseSnap.data()!;
    const requesterIsStaff = isCourseStaff(courseData, uid);
    if (!canAccessCourse(courseData, uid, true)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (targetUid !== uid && !requesterIsStaff) {
      return NextResponse.json({ error: "Only course staff can view student reports" }, { status: 403 });
    }

    const { course } = await fetchCourseAndLessonContext(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const student = await fetchCourseStudentProgressForUser(courseId, targetUid);
    const { eligible, reasons } = await isCourseCompletedForReport(course, student, targetUid);
    const latest = await fetchLatestPortfolioReport(courseId, targetUid);
    const reports = includeHistory ? await fetchPortfolioReports(courseId, targetUid) : undefined;
    const selectedReport = reportId ? await fetchPortfolioReportById(courseId, targetUid, reportId) : null;

    if (reportId && !selectedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      eligible,
      eligibilityReasons: reasons,
      report: latest ? { markdown: latest.markdown, generatedAt: latest.generatedAt, id: latest.id } : null,
      reports,
      selectedReport,
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Authorization") || msg.includes("token")) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("GET portfolio report:", err);
    return NextResponse.json({ error: msg || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const uid = await getVerifiedUid(req);
    const { courseId } = await params;
    const targetUid = req.nextUrl.searchParams.get("studentId")?.trim() || uid;
    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const courseData = courseSnap.data()!;
    const requesterIsStaff = isCourseStaff(courseData, uid);
    if (!canAccessCourse(courseData, uid, true)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (targetUid !== uid && !requesterIsStaff) {
      return NextResponse.json({ error: "Only course staff can generate student reports" }, { status: 403 });
    }

    const { course } = await fetchCourseAndLessonContext(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const student = await fetchCourseStudentProgressForUser(courseId, targetUid);
    const { eligible, reasons } = await isCourseCompletedForReport(course, student, targetUid);
    if (!eligible) {
      return NextResponse.json(
        { error: "Course not complete for portfolio report", eligibilityReasons: reasons },
        { status: 403 },
      );
    }

    const aggregate = await aggregatePortfolioInput(course, targetUid, student?.lessonProgress);
    const markdown = await generatePortfolioMarkdown(aggregate);
    const { id, generatedAt } = await savePortfolioReport(courseId, targetUid, markdown);

    return NextResponse.json({ markdown, generatedAt, id });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Authorization") || msg.includes("token")) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("POST portfolio report:", err);
    return NextResponse.json({ error: msg || "Failed" }, { status: 500 });
  }
}
