import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { getVerifiedUid } from "@/app/api/helpers";
import { getUserById } from "@/app/api/users/helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 401 });

    const { projectId } = await params;

    try {
        // Fetch the project to check access
        const projectRef = adminDb.collection("projects").doc(projectId);
        const projectSnap = await projectRef.get();
        if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const projectData = projectSnap.data();
        const ownerId = projectData?.ownerId;

        // Get user profile
        const userRef = adminDb.collection("users").doc(uid);
        const userSnap = await userRef.get();
        const userEmail = userSnap.exists ? userSnap.data()?.email : null;

        // Check access: owner, sharedWith, or collaborators
        const hasAccess = ownerId === uid || projectData?.sharedWith?.includes(uid) || (userEmail && projectData?.collaborators?.includes(userEmail));
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Fetch invitations for this project
        const invitationsQuery = adminDb.collection("invitations").where("projectId", "==", projectId);
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

        return NextResponse.json({
            invitations,
        });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}