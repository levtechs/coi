// app/api/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getVerifiedUid } from "../../helpers";


export async function GET(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await context.params;  // <- await here

    try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const data = snap.data();
        if (data.ownerId !== uid && !(data.sharedWith ?? []).includes(uid)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        return NextResponse.json({ id: projectId, ...data });
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
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const data = snap.data();

        if (data.ownerId !== uid && !(data.sharedWith ?? []).includes(uid)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Only allow certain fields to be updated
        const updates: {title?: string, content?: string} = {};
        if (body.title) updates.title = body.title;
        if (body.content) updates.content = body.content;

        await updateDoc(projectRef, updates);

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
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        const data = snap.data();

        if (data.ownerId !== uid) {
            return NextResponse.json({ error: "Only the owner can delete a project" }, { status: 403 });
        }

        // Delete the project document
        await deleteDoc(projectRef);

        // Remove the projectId from the user's projectIds array
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentProjectIds = userData.projectIds || [];
            const updatedProjectIds = currentProjectIds.filter((id: string) => id !== projectId);
            await updateDoc(userRef, { projectIds: updatedProjectIds });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
