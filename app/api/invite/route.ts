import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc } from "firebase/firestore";

import { getVerifiedUid } from "@/app/api/helpers";
import { getUserById } from "@/app/api/users/helpers";

/**
 * Generates a random 6-digit string for the invitation token.
 * @returns {string} The 6-digit token.
 */
function generateToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates a new invitation for a project or course.
 * The requester must be the owner.
 */
export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const body = await req.json();
    const { projectId, courseId } = body as { projectId?: string; courseId?: string };

    if (!projectId && !courseId) return NextResponse.json({ error: "No projectId or courseId provided" }, { status: 400 });

    try {
        let ownerId: string | undefined;

        let existingToken: string | null = null;

        let hasAccess = false;

        if (projectId) {
            const projectRef = doc(db, "projects", projectId);
            const projectSnap = await getDoc(projectRef);
            if (!projectSnap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });
            const projectData = projectSnap.data();
            ownerId = projectData?.ownerId;

            // Get user email
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            const userEmail = userSnap.exists() ? userSnap.data()?.email : null;

            // Check access: owner, sharedWith, or collaborators
            if (ownerId === uid || projectData?.sharedWith?.includes(uid) || (userEmail && projectData?.collaborators?.includes(userEmail))) {
                hasAccess = true;
            }

            // Check if user has existing invite for this project
            const userInviteId = projectData?.inviteIds?.[uid];
            if (userInviteId) {
                const inviteRef = doc(db, "invitations", userInviteId);
                const inviteSnap = await getDoc(inviteRef);
                if (inviteSnap.exists()) {
                    existingToken = inviteSnap.data()?.token;
                }
            }
        } else if (courseId) {
            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            if (!courseSnap.exists()) return NextResponse.json({ error: "Course not found" }, { status: 404 });
            const courseData = courseSnap.data();
            ownerId = courseData?.ownerId;

            // Check access: owner or sharedWith
            if (ownerId === uid || courseData?.sharedWith?.includes(uid)) {
                hasAccess = true;
            }
        } else {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (existingToken) {
            return NextResponse.json({ token: existingToken });
        }

        // Create a new invitation in the top-level 'invitations' collection
        const invitationsRef = collection(db, "invitations");
        const token = generateToken();
        const createdAt = new Date().toISOString();

        const inviteDocRef = await addDoc(invitationsRef, {
            token,
            projectId: projectId || null,
            courseId: courseId || null,
            createdBy: uid,
            createdAt,
            acceptedBy: [],
        });

        // If it's a project, update the project with inviteIds map
        if (projectId) {
            const projectRef = doc(db, "projects", projectId);
            await updateDoc(projectRef, {
                [`inviteIds.${uid}`]: inviteDocRef.id,
            });
        }

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
        const courseId = invitationData.courseId;

        if (!projectId && !courseId) return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });

        // Check if user is already shared with
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const userEmail = userSnap.data()?.email;

        if (projectId) {
            const projectRef = doc(db, "projects", projectId);
            const projectSnap = await getDoc(projectRef);
            const projectData = projectSnap.data();

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
        } else if (courseId) {
            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            const courseData = courseSnap.data();

            if (courseData?.sharedWith?.includes(uid)) {
                // Already shared with, return success
                return NextResponse.json({ success: true, message: "Already shared with" });
            }

            // Add user to course's sharedWith
            await updateDoc(courseRef, {
                sharedWith: arrayUnion(uid),
            });

            // Note: courses don't have collaborators list like projects, so no email addition
        }

        // Add user to invitation's acceptedBy list
        await updateDoc(doc(db, "invitations", invitationSnap.id), {
            acceptedBy: arrayUnion(uid),
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
        const courseId = invitationData.courseId;
        const createdBy = invitationData.createdBy;

        let title: string;
        let type: 'project' | 'course';
        if (projectId) {
            type = 'project';
            const projectRef = doc(db, "projects", projectId);
            const projectSnap = await getDoc(projectRef);
            if (!projectSnap.exists()) return NextResponse.json({ error: "Project not found" }, { status: 404 });
            title = projectSnap.data()?.title;
        } else if (courseId) {
            type = 'course';
            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            if (!courseSnap.exists()) return NextResponse.json({ error: "Course not found" }, { status: 404 });
            title = courseSnap.data()?.title;
        } else {
            return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
        }

        // Fetch the creator's name
        const creator = await getUserById(createdBy);
        const createdByName = creator ? creator.displayName : 'Unknown';

        return NextResponse.json({ title, type, createdByName, id: projectId || courseId });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
