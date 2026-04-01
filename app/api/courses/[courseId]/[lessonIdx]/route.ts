import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getVerifiedUid } from "../../../helpers";
import { Project } from "@/lib/types/project";
import { getLessonFromCourse } from "./helpers";
import { createProject } from "../../../projects/helpers";
import { Filter } from "firebase-admin/firestore";
import { recordLessonProjectStart } from "@/app/api/courses/progress_helpers";
import { getUserById } from "@/app/api/users/helpers";
import * as admin from "firebase-admin";

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

    const { lesson, hasAccess, courseResources, lessonCount } = await getLessonFromCourse(courseId, lessonIndex, uid);

    if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!lesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Fetch project IDs that belong to this lesson
    let projectIds: string[] = [];
    try {
        const projectsRef = adminDb.collection('projects');
        const snapshot = await projectsRef.where(
            Filter.and(
                Filter.where('courseLesson.id', '==', lesson.id),
                Filter.or(
                    Filter.where('ownerId', '==', uid),
                    Filter.where('sharedWith', 'array-contains', uid),
                    Filter.where('public', '==', true)
                )
            )
        ).get();
        projectIds = snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error fetching lesson projects:", error);
        // Don't fail the request if project fetching fails
    }

    return NextResponse.json({
        lesson,
        projectIds,
        courseResources: courseResources ?? [],
        lessonCount: lessonCount ?? 0,
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
        const courseRef = adminDb.collection('courses').doc(courseId);
        const courseSnap = await courseRef.get();
        const courseData = courseSnap.data() || {};

        // Check for existing projects from this lesson to determine if we need a number suffix
        let projectCount = 0;
        try {
            const projectsRef = adminDb.collection('projects');
            const snapshot = await projectsRef.where(
                Filter.and(
                    Filter.where('courseLesson.id', '==', lesson.id),
                    Filter.where('ownerId', '==', uid)
                )
            ).get();
            projectCount = snapshot.size;
        } catch (error) {
            console.error("Error counting existing projects:", error);
        }

        // Determine the project title with optional number suffix
        const template = lesson.baseProjectTemplate;
        const baseTitle = template?.title?.trim() || lesson.title;
        const projectTitle = projectCount > 0 ? `${baseTitle} ${projectCount + 1}` : baseTitle;
        const hierarchy = template?.hierarchy || {
            title: lesson.title,
            children: lesson.description ? [{ type: "text" as const, text: lesson.description }] : []
        };

        // Create a project from the lesson
        const projectId = await createProject({
            title: projectTitle,
            hierarchy,
            cards: template?.cards || [],
            uploads: [],
            courseLesson: lesson,
            courseId: courseId,
        }, uid);

        if (template?.messages && template.messages.length > 0) {
            await adminDb.collection('projects').doc(projectId).collection('chats').doc(uid).set({
                messages: template.messages,
            });
        }

        const usersToShare = new Set<string>();
        if (template?.shareWithOwner && courseData.ownerId && courseData.ownerId !== uid) {
            usersToShare.add(courseData.ownerId);
        }
        if (template?.shareWithStaff && Array.isArray(courseData.staffIds)) {
            for (const staffId of courseData.staffIds) {
                if (typeof staffId === 'string' && staffId !== uid) {
                    usersToShare.add(staffId);
                }
            }
        }

        if (usersToShare.size > 0) {
            const shareEntries = await Promise.all([...usersToShare].map(async (userId) => {
                const user = await getUserById(userId);
                return user?.email ? { userId, email: user.email } : null;
            }));
            const sharedWith = shareEntries.filter((entry): entry is { userId: string; email: string } => !!entry);

            if (sharedWith.length > 0) {
                await adminDb.collection('projects').doc(projectId).update({
                    sharedWith: sharedWith.map((entry) => entry.userId),
                    collaborators: sharedWith.map((entry) => entry.email),
                });

                for (const entry of sharedWith) {
                    await adminDb.collection('users').doc(entry.userId).update({
                        projectIds: admin.firestore.FieldValue.arrayUnion(projectId),
                    });
                }
            }
        }

        await recordLessonProjectStart(courseId, lesson, uid, projectId);

        // Fetch the created project to return it
        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectSnap = await projectRef.get();

        if (!projectSnap.exists) {
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
