import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { getVerifiedUid } from "@/app/api/helpers";
import { getCourseMemberIds, isCourseStaff } from "@/app/api/courses/helpers";
import { loadCourseAnalyticsBundle } from "@/app/api/courses/[courseId]/analytics/load_bundle";
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 401 });

    const { courseId } = await params;

    try {
        const courseRef = adminDb.collection("courses").doc(courseId);
        const courseSnap = await courseRef.get();
        if (!courseSnap.exists) return NextResponse.json({ error: "Course not found" }, { status: 404 });

        const courseData = courseSnap.data();
        if (!courseData || !isCourseStaff(courseData, uid)) {
            return NextResponse.json({ error: "Only course staff can view analytics" }, { status: 403 });
        }

        const totalUsers = getCourseMemberIds(courseData).length;

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

        const { students, rollups } = await loadCourseAnalyticsBundle(courseId);

        return NextResponse.json({
            totalUsers,
            invitations,
            students,
            rollups,
        });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
