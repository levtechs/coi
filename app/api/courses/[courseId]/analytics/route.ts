import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { getVerifiedUid } from "@/app/api/helpers";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
import { fetchCourseAndLessonContext } from "@/app/api/courses/helpers";
import { getUserById } from "@/app/api/users/helpers";
import { fetchCourseStudentProgress } from "@/app/api/courses/progress_helpers";
import { getCourseMemberIds, isCourseStaff } from "@/app/api/courses/helpers";
import { CourseStudentLessonProgress, CourseStudentProgress } from "@/lib/types/course";

async function buildDerivedStudentProgress(courseId: string): Promise<CourseStudentProgress[]> {
    const [{ course }, storedStudents, projectsSnap] = await Promise.all([
        fetchCourseAndLessonContext(courseId),
        fetchCourseStudentProgress(courseId),
        adminDb.collection("projects").where("courseId", "==", courseId).get(),
    ]);

    if (!course) {
        return storedStudents;
    }

    const storedStudentMap = new Map(storedStudents.map((student) => [student.userId, student]));
    const projectsByOwner = new Map<string, typeof projectsSnap.docs>();

    for (const projectDoc of projectsSnap.docs) {
        const ownerId = projectDoc.data().ownerId as string | undefined;
        if (!ownerId) continue;
        const existing = projectsByOwner.get(ownerId) || [];
        existing.push(projectDoc);
        projectsByOwner.set(ownerId, existing);
    }

    const allStudentIds = new Set<string>([
        ...storedStudents.map((student) => student.userId),
        ...projectsByOwner.keys(),
    ]);

    const derivedStudents = await Promise.all([...allStudentIds].map(async (studentId) => {
        const storedStudent = storedStudentMap.get(studentId);
        const user = storedStudent ? null : await getUserById(studentId);
        const ownedProjects = projectsByOwner.get(studentId) || [];
        const lessonProgressEntries = await Promise.all(course.lessons.map(async (lesson) => {
            const lessonProjects = ownedProjects.filter((projectDoc) => projectDoc.data().courseLesson?.id === lesson.id);
            if (lessonProjects.length === 0) {
                return null;
            }

            const cardSets = await Promise.all(lessonProjects.map(async (projectDoc) => {
                try {
                    return await fetchCardsFromProject(projectDoc.id);
                } catch (error) {
                    console.error(`Failed to fetch cards for project ${projectDoc.id}:`, error);
                    return [];
                }
            }));

            const totalCards = lesson.cardsToUnlock.length;
            const unlockedCounts = cardSets.map((cards) => cards.filter((card) => card.isUnlocked).length);
            const maxUnlockedCount = unlockedCounts.length > 0 ? Math.max(...unlockedCounts) : 0;
            const allUnlockedIds = [...new Set(cardSets.flatMap((cards) => cards.filter((card) => card.isUnlocked).map((card) => card.id)))];
            const sortedProjects = [...lessonProjects].sort((a, b) => {
                const aTime = new Date(String(a.data().createdAt || 0)).getTime();
                const bTime = new Date(String(b.data().createdAt || 0)).getTime();
                return aTime - bTime;
            });
            const existingLessonProgress = storedStudent?.lessonProgress?.[lesson.id];
            const isComplete = totalCards > 0 ? maxUnlockedCount >= totalCards : false;

            const lessonProgress: CourseStudentLessonProgress = {
                lessonId: lesson.id,
                lessonIndex: lesson.index,
                projectIds: lessonProjects.map((projectDoc) => projectDoc.id),
                unlockedCardIds: allUnlockedIds,
                startedAt: existingLessonProgress?.startedAt || sortedProjects[0]?.data().createdAt,
                lastProjectId: sortedProjects[sortedProjects.length - 1]?.id,
                latestQuizAttempt: existingLessonProgress?.latestQuizAttempt || null,
                bestQuizAttempt: existingLessonProgress?.bestQuizAttempt || null,
                ...(isComplete ? { completedAt: existingLessonProgress?.completedAt || sortedProjects[sortedProjects.length - 1]?.data().createdAt } : {}),
            };

            return lessonProgress;
        }));

        const lessonProgress = Object.fromEntries(
            lessonProgressEntries
                .filter((entry): entry is CourseStudentLessonProgress => entry !== null)
                .map((entry) => [entry.lessonId, entry]),
        );

        return {
            userId: studentId,
            email: storedStudent?.email || user?.email,
            displayName: storedStudent?.displayName || user?.displayName,
            joinedAt: storedStudent?.joinedAt,
            lastActiveAt: storedStudent?.lastActiveAt,
            completedLessonsCount: Object.values(lessonProgress).filter((entry) => !!entry.completedAt).length,
            lessonProgress,
            latestCourseQuizAttempt: storedStudent?.latestCourseQuizAttempt || null,
            bestCourseQuizAttempt: storedStudent?.bestCourseQuizAttempt || null,
            portfolioReportLatestId: storedStudent?.portfolioReportLatestId,
            portfolioReportGeneratedAt: storedStudent?.portfolioReportGeneratedAt,
        } satisfies CourseStudentProgress;
    }));

    return derivedStudents.sort((a, b) => {
        const aName = (a.displayName || a.email || a.userId).toLowerCase();
        const bName = (b.displayName || b.email || b.userId).toLowerCase();
        return aName.localeCompare(bName);
    });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 401 });

    const { courseId } = await params;

    try {
        // Fetch the course to check ownership and get sharedWith
        const courseRef = adminDb.collection("courses").doc(courseId);
        const courseSnap = await courseRef.get();
        if (!courseSnap.exists) return NextResponse.json({ error: "Course not found" }, { status: 404 });

        const courseData = courseSnap.data();
        if (!courseData || !isCourseStaff(courseData, uid)) {
            return NextResponse.json({ error: "Only course staff can view analytics" }, { status: 403 });
        }

        const totalUsers = getCourseMemberIds(courseData).length;

        // Fetch invitations for this course
        const invitationsQuery = adminDb.collection("invitations").where("courseId", "==", courseId);
        const invitationSnaps = await invitationsQuery.get();

        const invitations = await Promise.all(invitationSnaps.docs.map(async (doc) => {
            const data = doc.data();
            const acceptedByUids = data.acceptedBy || [];

            // Fetch user details for acceptedBy
            const acceptedByUsers = await Promise.all(acceptedByUids.map(async (uid: string) => {
                return await getUserById(uid);
            }));

            return {
                token: data.token,
                createdAt: data.createdAt,
                createdBy: data.createdBy,
                acceptedBy: acceptedByUsers.filter(user => user !== null),
            };
        }));

        const students = await buildDerivedStudentProgress(courseId);

        return NextResponse.json({
            totalUsers,
            invitations,
            students,
        });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
