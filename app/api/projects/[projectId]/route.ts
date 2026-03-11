import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getVerifiedUid } from "../../helpers";
import { getProjectById } from "../helpers";


export async function GET(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await context.params;  // <- await here

    try {
        const project = await getProjectById(projectId, uid);
        if (!project) return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });

        return NextResponse.json(project);
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await context.params;  // <- await here
    const body = await req.json();

    try {
        const projectRef = adminDb.collection("projects").doc(projectId);
        const snap = await projectRef.get();

        if (!snap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const data = snap.data();
        if (!data) return NextResponse.json({ error: "Project data is empty" }, { status: 404 });

        if (data.ownerId !== uid && !(data.sharedWith ?? []).includes(uid)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Only allow certain fields to be updated
        const updates: {title?: string, content?: string} = {};
        if (body.title) updates.title = body.title;
        if (body.content) updates.content = body.content;

        await projectRef.update(updates);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await context.params;  // <- await here

    try {
        const projectRef = adminDb.collection("projects").doc(projectId);
        const snap = await projectRef.get();

        if (!snap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        const data = snap.data();

        if (data?.ownerId !== uid) {
            return NextResponse.json({ error: "Only the owner can delete a project" }, { status: 403 });
        }

        // Delete the project document
        await projectRef.delete();

        // Remove the projectId from the user's projectIds array
        const userRef = adminDb.collection("users").doc(uid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
            const userData = userSnap.data();
            const currentProjectIds = userData?.projectIds || [];
            const updatedProjectIds = currentProjectIds.filter((id: string) => id !== projectId);
            await userRef.update({ projectIds: updatedProjectIds });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
