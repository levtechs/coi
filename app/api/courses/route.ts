import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getVerifiedUid } from "../helpers";
import { Course, CourseLesson } from "@/lib/types/course";
import { Filter } from "firebase-admin/firestore";

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
                Filter.where('sharedWith', 'array-contains', uid),
                Filter.where('public', '==', true)
            )
        ).get();

        const courses = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const lessonsRef = doc.ref.collection('lessons');
                const lessonsSnap = await lessonsRef.get();
                const lessons = lessonsSnap.docs.map((p) => ({
                    id: p.id,
                    courseId: doc.id,
                    ...p.data(),
                })) as CourseLesson[];

                return {
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    lessons,
                    quizIds: data.quizIds || [],
                    public: data.public,
                    sharedWith: data.sharedWith,
                    category: data.category,
                    ownerId: data.ownerId,
                } as Course;
            })
        );
        return NextResponse.json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}
