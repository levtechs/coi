import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../helpers";
import { collection, getDocs, query, where, or } from "firebase/firestore";
import { Course, CourseProject } from "@/lib/types";

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
                const projectsRef = collection(db, 'courses', doc.id, 'projects');
                const projectsSnap = await getDocs(projectsRef);
                const projects = projectsSnap.docs.map((p) => ({
                    id: p.id,
                    ...p.data(),
                })) as CourseProject[];

                return {
                    id: doc.id,
                    ...data,
                    projects,
                } as Course;
            })
        );
        return NextResponse.json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}
