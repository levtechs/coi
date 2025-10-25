import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

import { getVerifiedUid } from "@/app/api/helpers";
import { getUserById } from "@/app/api/users/helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 401 });

    const { courseId } = await params;

    try {
        // Fetch the course to check ownership and get sharedWith
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) return NextResponse.json({ error: "Course not found" }, { status: 404 });

        const courseData = courseSnap.data();
        if (courseData?.ownerId !== uid) {
            return NextResponse.json({ error: "Only the owner can view analytics" }, { status: 403 });
        }

        const sharedWith = courseData?.sharedWith || [];
        const totalUsers = sharedWith.length;

        // Fetch invitations for this course
        const invitationsQuery = query(collection(db, "invitations"), where("courseId", "==", courseId));
        const invitationSnaps = await getDocs(invitationsQuery);

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
            totalUsers,
            invitations,
        });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
