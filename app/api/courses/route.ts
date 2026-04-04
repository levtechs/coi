import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getVerifiedUid } from "../helpers";
import { Course, CourseLesson } from "@/lib/types/course";
import { Filter } from "firebase-admin/firestore";
import { normalizeCourse, normalizeCourseLesson } from "@/app/api/courses/helpers";

/*
 * Fetches all courses available to a user.
 * Including courses that are shared with a user and courses that are public.
 **/
export async function GET(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    try {
        const coursesRef = adminDb.collection('courses');

        const snapshot = await coursesRef.where(
            Filter.or(
                Filter.where('ownerId', '==', uid),
                Filter.where('staffIds', 'array-contains', uid),
                Filter.where('sharedWith', 'array-contains', uid),
                Filter.where('public', '==', true)
            )
        ).get();

        // Firestore OR queries can return the same document more than once when it matches multiple disjuncts.
        const uniqueDocs = [...new Map(snapshot.docs.map((d) => [d.id, d])).values()];

        const courses = await Promise.all(
            uniqueDocs.map(async (doc) => {
                const data = doc.data();
                const lessonsRef = doc.ref.collection('lessons');
                const lessonsSnap = await lessonsRef.get();
                const lessons = lessonsSnap.docs.map((p) => normalizeCourseLesson(doc.id, p.id, p.data(), [])) as CourseLesson[];

                return normalizeCourse(doc.id, data, lessons) as Course;
            })
        );
        return NextResponse.json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}
