import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";

import { getVerifiedUid } from "@/app/api/helpers"

/**
 * Generates a random 6-digit string for the invitation token.
 * @returns {string} The 6-digit token.
 */
function generateToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates a new invitation for a project.
 * The requester must be the project owner.
 */
export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const body = await req.json();
    const { projectId } = body as { projectId: string };

    if (!projectId) return NextResponse.json({ error: "No projectId provided" }, { status: 400 });

    try {
        // Verify that the requester is the project owner
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists() || projectSnap.data()?.ownerId !== uid) {
            return NextResponse.json({ error: "Only the owner can create an invitation" }, { status: 403 });
        }

        // Create a new invitation in the top-level 'invitations' collection
        const invitationsRef = collection(db, "invitations");
        const token = generateToken();
        const createdAt = new Date().toISOString();

        await addDoc(invitationsRef, {
            token,
            projectId,
            createdAt,
        });

        return NextResponse.json({ token });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

/**
 * Accepts an invitation to a project.
 * The requester must be a signed-in user.
 */
export async function PUT(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const body = await req.json();
    const { token } = body as { token: string };

    if (!token) return NextResponse.json({ error: "No token provided" }, { status: 400 });

    try {
        // Find the invitation document by the token
        const invitationsQuery = query(collection(db, "invitations"), where("token", "==", token));
        const invitationSnaps = await getDocs(invitationsQuery);

        if (invitationSnaps.empty) {
            return NextResponse.json({ error: "Invalid token" }, { status: 404 });
        }

        const invitationSnap = invitationSnaps.docs[0];
        const invitationData = invitationSnap.data();
        const projectId = invitationData.projectId;
        const projectRef = doc(db, "projects", projectId);

        const projectSnap = await getDoc(projectRef);
        const projectData = projectSnap.data();

        // Check if user is already a collaborator
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const userEmail = userSnap.data()?.email;

        if (projectData?.sharedWith?.includes(uid)) {
            // Already a collaborator, return success
            return NextResponse.json({ success: true, message: "Already a collaborator" });
        }

        // Add user to project's collaborator lists
        await updateDoc(projectRef, {
            collaborators: arrayUnion(userEmail),
            sharedWith: arrayUnion(uid),
        });

        // Add projectId to user’s projectIds
        await updateDoc(userRef, {
            projectIds: arrayUnion(projectId),
        });


        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

/**
 * Returns the project title associated with a token.
 * This route does not require authentication.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) return NextResponse.json({ error: "No token provided" }, { status: 400 });

    try {
        const invitationsQuery = query(collection(db, "invitations"), where("token", "==", token));
        const invitationSnaps = await getDocs(invitationsQuery);
        
        if (invitationSnaps.empty) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

        const invitationData = invitationSnaps.docs[0].data();
        const projectId = invitationData.projectId;
        
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        return NextResponse.json({ title: projectSnap.data()?.title });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
