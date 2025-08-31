// app/api/projects/[projectId]/collaborators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

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
    console.log("nc")
    const uid = req.headers.get("x-user-id");
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    console.log(uid);

    const { projectId } = await params;
    console.log(req)
    const body = await req.json();
    const email = body.email;
    console.log("email" + email);
    console.log(projectId)

    if (!email) return NextResponse.json({ error: "No email provided" }, { status: 400 });

    try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        const data = snap.data();

        if (data.ownerId !== uid) return NextResponse.json({ error: "Only owner can add collaborators" }, { status: 403 });

        await updateDoc(projectRef, {
            collaborators: arrayUnion(email),
        });

        // Optional: add projectId to the user's projectIds
        // const userRef = doc(db, "users", uid);
        // const userSnap = await getDoc(userRef);
        // const projectIds = userSnap.exists() ? userSnap.data().projectIds || [] : [];
        // await updateDoc(userRef, { projectIds: [...projectIds, projectId] });

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

        await updateDoc(projectRef, {
            collaborators: arrayRemove(email),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
