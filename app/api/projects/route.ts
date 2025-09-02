// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { Project } from "@/lib/types";
import { doc, getDoc, collection, updateDoc, addDoc} from "firebase/firestore";
import { getVerifiedUid } from "../helpers";

export async function GET(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    try {
        // 1) load user document
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // No user doc -> return empty list rather than throwing
            return NextResponse.json({ projects: [] });
        }

        const userData = userSnap.data() as { projectIds?: string[] } | undefined;
        const projectIds = Array.isArray(userData?.projectIds) ? userData!.projectIds : [];

        if (projectIds.length === 0) {
            return NextResponse.json({ projects: [] });
        }

        // 2) fetch each project by id (use Promise.all so requests run in parallel)
        const projectPromises = projectIds.map(async (pid) => {
            try {
                const pRef = doc(db, "projects", pid);
                const pSnap = await getDoc(pRef);
                if (!pSnap.exists()) return null;
                return { id: pSnap.id, ...(pSnap.data() ?? {}) };
            } catch (e) {
                // if a single project read fails, ignore it but log for debugging
                console.error("Failed to fetch project", pid, e);
                return null;
            }
        });

        const resolved = await Promise.all(projectPromises);
        const projects = resolved.filter(
        (p): p is Project => p !== null && typeof p.id === "string"
        );

        return NextResponse.json({ projects });
    } catch (err) {
        console.error("GET /api/projects error:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const body = await req.json();
    const title = body.title || "Untitled Project";
    const content = body.content || "";

    try {
        // 1️⃣ Create the new project document
        const projectsCol = collection(db, "projects");
        const docRef = await addDoc(projectsCol, {
            title,
            content,
            ownerId: uid,
            collaborators: [],
            sharedWith: [],
        });

        // 2️⃣ Add the projectId to the user's projectIds array
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        const currentProjectIds = (userSnap.exists() ? userSnap.data().projectIds || [] : []);
        await updateDoc(userRef, { projectIds: [...currentProjectIds, docRef.id] });

        return NextResponse.json({ id: docRef.id });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
