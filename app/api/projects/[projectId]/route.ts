// app/api/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getVerifiedUid } from "../../helpers";

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await params;

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

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await params;
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
        const updates: any = {};
        if (body.title) updates.title = body.title;
        if (body.content) updates.content = body.content;

        await updateDoc(projectRef, updates);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { projectId: string } }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await params;

    try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        const data = snap.data();

        if (data.ownerId !== uid) {
            return NextResponse.json({ error: "Only the owner can delete a project" }, { status: 403 });
        }

        await deleteDoc(projectRef);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
