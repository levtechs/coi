import { adminDb } from "@/lib/firebaseAdmin";
import { CourseAnalyticsOverviewDoc, CourseAnalyticsOverviewRecord } from "@/lib/types/course_analytics";

const COLLECTION = "analyticsOverviews";

export async function saveCourseAnalyticsOverview(courseId: string, markdown: string): Promise<{ id: string; generatedAt: string }> {
    const ref = adminDb.collection("courses").doc(courseId).collection(COLLECTION).doc();
    const generatedAt = new Date().toISOString();
    const payload: CourseAnalyticsOverviewDoc = { markdown, generatedAt, schemaVersion: 1 };
    await ref.set(payload);
    return { id: ref.id, generatedAt };
}

export async function fetchCourseAnalyticsOverviewById(courseId: string, reportId: string): Promise<CourseAnalyticsOverviewRecord | null> {
    const snap = await adminDb.collection("courses").doc(courseId).collection(COLLECTION).doc(reportId).get();
    if (!snap.exists) return null;
    const data = snap.data() as CourseAnalyticsOverviewDoc;
    return { id: snap.id, ...data };
}

/** Most recent first */
export async function fetchRecentCourseAnalyticsOverviews(courseId: string, limit: number): Promise<CourseAnalyticsOverviewRecord[]> {
    const snap = await adminDb
        .collection("courses")
        .doc(courseId)
        .collection(COLLECTION)
        .orderBy("generatedAt", "desc")
        .limit(limit)
        .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as CourseAnalyticsOverviewDoc) }));
}
