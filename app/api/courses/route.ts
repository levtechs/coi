import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../helpers";
import { collection, getDocs, query, where, or } from "firebase/firestore";
import { Course, CourseLesson } from "@/lib/types";

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
        const coursesRef = collection(db, 'courses');
        const q = query(
            coursesRef,
            or(
                where('ownerId', '==', uid),
                where('sharedWith', 'array-contains', uid),
                where('public', '==', true)
            )
        );
        const snapshot = await getDocs(q);

        const courses = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const lessonsRef = collection(db, 'courses', doc.id, 'lessons');
                const lessonsSnap = await getDocs(lessonsRef);
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
                    public: data.public,
                    sharedWith: data.sharedWith,
                    category: data.category,
                } as Course;
            })
        );
        return NextResponse.json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}
