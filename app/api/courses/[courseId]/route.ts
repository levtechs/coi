import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../helpers";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { Course, CourseProject } from "@/lib/types";

export async function GET(
    req: NextRequest,
    { params }: { params: { courseId: string } }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;

    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();

        // Check access: owner, shared, or public
        const hasAccess =
            courseData.ownerId === uid ||
            (courseData.sharedWith && courseData.sharedWith.includes(uid)) ||
            courseData.public === true;

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Fetch projects subcollection
        const projectsRef = collection(db, 'courses', courseId, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        const projects = projectsSnap.docs.map((p) => ({
            id: p.id,
            ...p.data(),
        })) as CourseProject[];

        const course: Course = {
            id: courseSnap.id,
            title: courseData.title,
            projects,
            public: courseData.public,
            sharedWith: courseData.sharedWith || [],
            category: courseData.category,
        };

        return NextResponse.json(course);
    } catch (error) {
        console.error("Error fetching course:", error);
        return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
    }
}