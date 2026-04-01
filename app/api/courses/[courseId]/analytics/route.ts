import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { getVerifiedUid } from "@/app/api/helpers";
import { fetchCourseAndLessonContext } from "@/app/api/courses/helpers";
import { fetchCourseStudentProgress } from "@/app/api/courses/progress_helpers";
import { deriveLessonProgressFromProjectsForAnalytics } from "@/app/api/courses/report_completion";
import { getCourseMemberIds, isCourseStaff } from "@/app/api/courses/helpers";
import { CourseStudentLessonProgress, CourseStudentProgress } from "@/lib/types/course";
import { User } from "@/lib/types/user";

async function loadUsersByIds(userIds: string[]): Promise<Map<string, User>> {
    if (userIds.length === 0) return new Map();

    const refs = userIds.map((userId) => adminDb.collection("users").doc(userId));
    const snaps = await adminDb.getAll(...refs);
    return new Map(
        snaps
            .filter((snap) => snap.exists)
            .map((snap) => {
                const data = snap.data()!;
                return [snap.id, {
                    id: snap.id,
                    email: data.email,
                    displayName: data.displayName,
                    actions: data.actions,
                    dailyActions: data.dailyActions,
                    weeklyActions: data.weeklyActions,
                    projectIds: data.projectIds,
                    friendIds: data.friendIds,
                    starUser: data.starUser || false,
                    signUpResponses: data.signUpResponses,
                } satisfies User];
            }),
    );
}

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
    const missingStudentIds = [...allStudentIds].filter((studentId) => !storedStudentMap.has(studentId));
    const usersById = await loadUsersByIds(missingStudentIds);

    const derivedStudents = await Promise.all([...allStudentIds].map(async (studentId) => {
        const storedStudent = storedStudentMap.get(studentId);
        const user = storedStudent ? null : usersById.get(studentId) || null;
        const ownedProjects = projectsByOwner.get(studentId) || [];
        const ownedProjectsByLessonId = new Map<string, typeof ownedProjects>();

        for (const projectDoc of ownedProjects) {
            const lessonId = projectDoc.data().courseLesson?.id as string | undefined;
            if (!lessonId) continue;
            const existing = ownedProjectsByLessonId.get(lessonId) || [];
            existing.push(projectDoc);
            ownedProjectsByLessonId.set(lessonId, existing);
        }

        const lessonProgressEntries = await Promise.all(course.lessons.map(async (lesson) => {
            const lessonProjects = ownedProjectsByLessonId.get(lesson.id) || [];
            const existingLessonProgress = storedStudent?.lessonProgress?.[lesson.id];
            const mergedProjectIds = [
                ...new Set([
                    ...(existingLessonProgress?.projectIds || []),
                    ...lessonProjects.map((projectDoc) => projectDoc.id),
                ]),
            ];

            if (mergedProjectIds.length === 0 && !existingLessonProgress) {
                return null;
            }

            const sortedProjects = [...lessonProjects].sort((a, b) => {
                const aTime = new Date(String(a.data().createdAt || 0)).getTime();
                const bTime = new Date(String(b.data().createdAt || 0)).getTime();
                return aTime - bTime;
            });

            const startedAt =
                existingLessonProgress?.startedAt ||
                sortedProjects[0]?.data().createdAt ||
                undefined;

            let unlockedCardIds = [...(existingLessonProgress?.unlockedCardIds || [])];
            let completedAt = existingLessonProgress?.completedAt;
            let derivedUnlockSlotCount: number | undefined;

            if (lesson.cardsToUnlock.length > 0 && mergedProjectIds.length > 0) {
                const derived = await deriveLessonProgressFromProjectsForAnalytics(lesson, mergedProjectIds);
                derivedUnlockSlotCount = derived.displayUnlockedCount;
                unlockedCardIds = [
                    ...new Set([...unlockedCardIds, ...derived.matchingUnlockedProjectCardIds]),
                ];
                if (derived.allRequiredUnlocked && !completedAt) {
                    const last = sortedProjects.length > 0 ? sortedProjects[sortedProjects.length - 1] : null;
                    const lastData = last?.data();
                    completedAt = (lastData?.updatedAt ||
                        lastData?.createdAt ||
                        existingLessonProgress?.startedAt) as string | undefined;
                }
            } else if (lesson.cardsToUnlock.length === 0) {
                if (!completedAt && sortedProjects.length > 0) {
                    completedAt = sortedProjects[sortedProjects.length - 1]?.data().createdAt as string | undefined;
                }
            }

            const lastProjectId =
                sortedProjects.length > 0
                    ? sortedProjects[sortedProjects.length - 1]!.id
                    : existingLessonProgress?.lastProjectId;

            const lessonProgress: CourseStudentLessonProgress = {
                lessonId: lesson.id,
                lessonIndex: lesson.index,
                projectIds: mergedProjectIds,
                unlockedCardIds,
                ...(derivedUnlockSlotCount !== undefined ? { derivedUnlockSlotCount } : {}),
                startedAt,
                lastProjectId,
                latestQuizAttempt: existingLessonProgress?.latestQuizAttempt || null,
                bestQuizAttempt: existingLessonProgress?.bestQuizAttempt || null,
                ...(completedAt ? { completedAt } : {}),
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

        const invitationRows = invitationSnaps.docs.map((doc) => ({
            token: doc.data().token,
            createdAt: doc.data().createdAt,
            createdBy: doc.data().createdBy,
            acceptedByUids: doc.data().acceptedBy || [],
        }));
        const acceptedByUsers = await loadUsersByIds([...new Set(invitationRows.flatMap((row) => row.acceptedByUids))]);

        const invitations = invitationRows.map((row) => {
            return {
                token: row.token,
                createdAt: row.createdAt,
                createdBy: row.createdBy,
                acceptedBy: row.acceptedByUids
                    .map((acceptedUid: string) => acceptedByUsers.get(acceptedUid))
                    .filter((user: User | undefined): user is User => !!user),
            };
        });

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
