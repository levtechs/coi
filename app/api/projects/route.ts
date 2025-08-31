// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDocs, getDoc, updateDoc } from "firebase/firestore";

export async function GET(req: NextRequest) {
    const uid = req.headers.get("x-user-id");
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDocs(collection(db, "projects")); // we will filter later

        const allProjects: any[] = [];
        const projectsCol = collection(db, "projects");
        const querySnapshot = await getDocs(projectsCol);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // user is owner or has access
            if (data.ownerId === uid || (data.sharedWith ?? []).includes(uid)) {
                allProjects.push({ id: doc.id, ...data });
            }
        });

        return NextResponse.json({ projects: allProjects });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const uid = req.headers.get("x-user-id");
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
