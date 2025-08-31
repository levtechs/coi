// app/api/projects/[projectId]/collaborators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

import { getUserRefByEmail } from "@/app/api/helpers"

// Same result as if you were to get the project, then check who it's shared with 
export async function GET(
    req: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const uid = req.headers.get("x-user-id");
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await params;

    try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists())
            return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const data = snap.data();

        // Only owner or shared users can view collaborators
        if (data.ownerId !== uid && !(data.sharedWith ?? []).includes(uid)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        return NextResponse.json({ collaborators: data.collaborators || [] });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
    const uid = req.headers.get("x-user-id");
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await params;
    const body = await req.json();
    const email = body.email;

    if (!email) return NextResponse.json({ error: "No email provided" }, { status: 400 });

    try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        const data = snap.data();

        if (data.ownerId !== uid) return NextResponse.json({ error: "Only owner can add collaborators" }, { status: 403 });

        // Add collaborator email to project
        await updateDoc(projectRef, {
            collaborators: arrayUnion(email),
        });

        // Find user by email
        const userRef = await getUserRefByEmail(email);
        if (!userRef) {
            return NextResponse.json({ error: "UserNotFound" }, { status: 404 });
        }

        // Add projectId to user’s projectIds
        await updateDoc(userRef, {
            projectIds: arrayUnion(projectId),
        });

        // Add projectId to project's sharedWith
        await updateDoc(projectRef, {
            sharedWith: arrayUnion(userRef.id),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { projectId: string } }) {
    const uid = req.headers.get("x-user-id");
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { projectId } = await params;
    const body = await req.json();
    const email = body.email;

    if (!email) return NextResponse.json({ error: "No email provided" }, { status: 400 });

    try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        const data = snap.data();

        if (data.ownerId !== uid) return NextResponse.json({ error: "Only owner can remove collaborators" }, { status: 403 });

        // Remove collaborator email from project
        await updateDoc(projectRef, {
            collaborators: arrayRemove(email),
        });

        // Find user by email
        const userRef = await getUserRefByEmail(email);
        if (!userRef) {
            return NextResponse.json({ error: "UserNotFound" }, { status: 404 });
        }

        // Remove projectId from user’s projectIds
        await updateDoc(userRef, {
            projectIds: arrayRemove(projectId),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
