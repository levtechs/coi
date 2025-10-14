import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../../helpers";
import { doc, getDoc, collection, getDocs, query, where, or, and } from "firebase/firestore";
import { Project } from "@/lib/types";
import { getLessonFromCourse } from "./helpers";
import { createProject } from "../../../projects/helpers";

/**
 * GET /api/courses/[courseId]/[lessonIdx]
 * Retrieves a specific lesson from a course.
 * Requires user authentication and access to the course.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string; lessonIdx: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, lessonIdx } = await params;
    const lessonIndex = parseInt(lessonIdx);

    const { lesson, hasAccess } = await getLessonFromCourse(courseId, lessonIndex, uid);

    if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!lesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Fetch project IDs that belong to this lesson
    let projectIds: string[] = [];
    try {
        const projectsRef = collection(db, 'projects');
        const q = query(
            projectsRef,
            and(
                where('courseLesson.id', '==', lesson.id),
                or(
                    where('ownerId', '==', uid),
                    where('sharedWith', 'array-contains', uid),
                    where('public', '==', true)
                )
            )
        );
        const projectsSnap = await getDocs(q);
        projectIds = projectsSnap.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error fetching lesson projects:", error);
        // Don't fail the request if project fetching fails
    }

    return NextResponse.json({
        lesson,
        projectIds
    });
}

/**
 * POST /api/courses/[courseId]/[lessonIdx]
 * Creates a new project based on the lesson content.
 * The lesson's title becomes the project title, and the lesson description
 * becomes the initial content in the project's hierarchy.
 * Requires user authentication and access to the course.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string; lessonIdx: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, lessonIdx } = await params;
    const lessonIndex = parseInt(lessonIdx);

    const { lesson, hasAccess } = await getLessonFromCourse(courseId, lessonIndex, uid);

    if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!lesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    try {
        // Create a project from the lesson
        const projectId = await createProject({
            title: lesson.title,
            hierarchy: {
                title: lesson.title,
                children: lesson.description ? [{ type: "text", text: lesson.description }] : []
            },
            cards: [],
            courseLesson: lesson,
            courseId: courseId,
        }, uid);

        // Fetch the created project to return it
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            return NextResponse.json({ error: "Failed to retrieve created project" }, { status: 500 });
        }

        const project: Project = {
            id: projectSnap.id,
            ...projectSnap.data(),
        } as Project;

        return NextResponse.json(project);
    } catch (error) {
        console.error("Error creating project from lesson:", error);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}