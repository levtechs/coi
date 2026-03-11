import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";
import { getVerifiedUid, getVerifiedProjectAccess } from "@/app/api/helpers"

// Same result as if you were to get the project, then check who it's shared with 
export async function GET(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await context.params;

    try {
        await getVerifiedProjectAccess(req, projectId);
        const projectRef = adminDb.collection("projects").doc(projectId);
        const snap = await projectRef.get();
        // snap is guaranteed to exist by getVerifiedProjectAccess
        const data = snap.data();
        return NextResponse.json({ collaborators: data?.collaborators || [] });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await context.params;
    try {
        const uid = await getVerifiedUid(req);
        const body = await req.json();
        const email = body.email as string | undefined;
        const userId = body.userId as string | undefined;

        if (!email && !userId) return NextResponse.json({ error: "No email or userId provided" }, { status: 400 });

        const projectRef = adminDb.collection("projects").doc(projectId);
        const snap = await projectRef.get();

        if (!snap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        const data = snap.data();
        if (!data) return NextResponse.json({ error: "Project data is empty" }, { status: 404 });

        if (data.ownerId !== uid) return NextResponse.json({ error: "Only owner can add collaborators" }, { status: 403 });

        if (userId) {
            // Add collaborator by userId directly
            const targetUserRef = adminDb.collection("users").doc(userId);
            const targetUserSnap = await targetUserRef.get();
            if (!targetUserSnap.exists) {
                return NextResponse.json({ error: "UserNotFound" }, { status: 404 });
            }
            const targetUserData = targetUserSnap.data();

            // Check if already shared
            if ((data.sharedWith ?? []).includes(userId)) {
                return NextResponse.json({ error: "User already has access" }, { status: 409 });
            }

            const targetEmail = targetUserData?.email;
            if (!targetEmail || typeof targetEmail !== "string") {
                return NextResponse.json({ error: "Target user has no valid email" }, { status: 400 });
            }

            await projectRef.update({
                collaborators: admin.firestore.FieldValue.arrayUnion(targetEmail),
                sharedWith: admin.firestore.FieldValue.arrayUnion(userId),
            });
            await targetUserRef.update({
                projectIds: admin.firestore.FieldValue.arrayUnion(projectId),
            });

            return NextResponse.json({ success: true });
        }

        // Add collaborator by email (original flow)
        await projectRef.update({
            collaborators: admin.firestore.FieldValue.arrayUnion(email),
        });

        // Find user by email
        const usersSnap = await adminDb.collection("users").where("email", "==", email!).get();
        if (usersSnap.empty) {
            return NextResponse.json({ error: "UserNotFound" }, { status: 404 });
        }
        const targetUserRef = usersSnap.docs[0].ref;

        // Add projectId to user's projectIds
        await targetUserRef.update({
            projectIds: admin.firestore.FieldValue.arrayUnion(projectId),
        });

        // Add projectId to project's sharedWith
        await projectRef.update({
            sharedWith: admin.firestore.FieldValue.arrayUnion(targetUserRef.id),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await context.params;

    try {
        const uid = await getVerifiedUid(req);
        const body = await req.json();
        const email = body.email;

        if (!email) return NextResponse.json({ error: "No email provided" }, { status: 400 });

        const projectRef = adminDb.collection("projects").doc(projectId);
        const snap = await projectRef.get();

        if (!snap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        const data = snap.data();

        if (data?.ownerId !== uid) return NextResponse.json({ error: "Only owner can remove collaborators" }, { status: 403 });

        // Remove collaborator email from project
        await projectRef.update({
            collaborators: admin.firestore.FieldValue.arrayRemove(email),
        });

        // Find user by email
        const usersSnap = await adminDb.collection("users").where("email", "==", email).get();
        if (usersSnap.empty) {
            return NextResponse.json({ error: "UserNotFound" }, { status: 404 });
        }
        const targetUserRef = usersSnap.docs[0].ref;

        // Remove projectId from user's projectIds
        await targetUserRef.update({
            projectIds: admin.firestore.FieldValue.arrayRemove(projectId),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
