import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { getVerifiedProjectAccess } from "@/app/api/helpers";
import { getUserById } from "@/app/api/users/helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params;

    try {
        await getVerifiedProjectAccess(req, projectId);
        
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