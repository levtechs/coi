import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

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
    const { projectId, courseId, friendRequest } = body as { projectId?: string; courseId?: string; friendRequest?: boolean };

    // Handle friend request invitation creation
    if (friendRequest) {
        try {
            const invitationsRef = adminDb.collection("invitations");
            const token = generateToken();
            const createdAt = new Date().toISOString();

            await invitationsRef.add({
                token,
                projectId: null,
                courseId: null,
                friendRequest: true,
                requesterId: uid,
                createdBy: uid,
                createdAt,
                acceptedBy: [],
            });

            return NextResponse.json({ token });
        } catch (err) {
            return NextResponse.json({ error: (err as Error).message }, { status: 500 });
        }
    }

    if (!projectId && !courseId) return NextResponse.json({ error: "No projectId or courseId provided" }, { status: 400 });

    try {
        let ownerId: string | undefined;

        let existingToken: string | null = null;

        let hasAccess = false;

        if (projectId) {
            const projectRef = adminDb.collection("projects").doc(projectId);
            const projectSnap = await projectRef.get();
            if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
            const projectData = projectSnap.data();
            ownerId = projectData?.ownerId;

            // Get user email
            const userRef = adminDb.collection("users").doc(uid);
            const userSnap = await userRef.get();
            const userEmail = userSnap.exists ? userSnap.data()?.email : null;

            // Check access: owner, sharedWith, or collaborators
            if (ownerId === uid || projectData?.sharedWith?.includes(uid) || (userEmail && projectData?.collaborators?.includes(userEmail))) {
                hasAccess = true;
            }

            // Check if user has existing invite for this project
            const userInviteId = projectData?.inviteIds?.[uid];
            if (userInviteId) {
                const inviteRef = adminDb.collection("invitations").doc(userInviteId);
                const inviteSnap = await inviteRef.get();
                if (inviteSnap.exists) {
                    existingToken = inviteSnap.data()?.token;
                }
            }
        } else if (courseId) {
            const courseRef = adminDb.collection("courses").doc(courseId);
            const courseSnap = await courseRef.get();
            if (!courseSnap.exists) return NextResponse.json({ error: "Course not found" }, { status: 404 });
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
        const invitationsRef = adminDb.collection("invitations");
        const token = generateToken();
        const createdAt = new Date().toISOString();

        const inviteDocRef = await invitationsRef.add({
            token,
            projectId: projectId || null,
            courseId: courseId || null,
            createdBy: uid,
            createdAt,
            acceptedBy: [],
        });

        // If it's a project, update the project with inviteIds map
        if (projectId) {
            const projectRef = adminDb.collection("projects").doc(projectId);
            await projectRef.update({
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
        const invitationsRef = adminDb.collection("invitations");
        const invitationSnaps = await invitationsRef.where("token", "==", token).get();

        if (invitationSnaps.empty) {
            return NextResponse.json({ error: "Invalid token" }, { status: 404 });
        }

        const invitationSnap = invitationSnaps.docs[0];
        const invitationData = invitationSnap.data();
        const projectId = invitationData.projectId;
        const courseId = invitationData.courseId;
        const isFriendRequest = invitationData.friendRequest === true;

        // Handle friend request acceptance
        if (isFriendRequest) {
            const requesterId = invitationData.requesterId || invitationData.createdBy;

            if (requesterId === uid) {
                return NextResponse.json({ error: "Cannot accept your own friend request" }, { status: 400 });
            }

            // Check if already friends
            const friendshipsRef = adminDb.collection("friendships");
            const sortedUsers = [uid, requesterId].sort();
            const existingSnaps = await friendshipsRef.where("users", "==", sortedUsers).get();

            if (!existingSnaps.empty) {
                return NextResponse.json({ success: true, message: "Already friends or request pending" });
            }

            // Create accepted friendship directly
            const friendshipRef = friendshipsRef.doc();
            await friendshipRef.set({
                users: sortedUsers,
                status: "accepted",
                requesterId: requesterId,
                createdAt: new Date().toISOString(),
                acceptedAt: new Date().toISOString(),
            });

            // Update both users' friendIds
            const requesterRef = adminDb.collection("users").doc(requesterId);
            const accepterRef = adminDb.collection("users").doc(uid);
            await requesterRef.update({ friendIds: admin.firestore.FieldValue.arrayUnion(uid) });
            await accepterRef.update({ friendIds: admin.firestore.FieldValue.arrayUnion(requesterId) });

            // Mark invitation as accepted
            await invitationsRef.doc(invitationSnap.id).update({
                acceptedBy: admin.firestore.FieldValue.arrayUnion(uid),
            });

            return NextResponse.json({ success: true, friendRequest: true });
        }

        if (!projectId && !courseId) return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });

        // Check if user is already shared with
        const userRef = adminDb.collection("users").doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const userEmail = userSnap.data()?.email;

        if (projectId) {
            const projectRef = adminDb.collection("projects").doc(projectId);
            const projectSnap = await projectRef.get();
            const projectData = projectSnap.data();

            if (projectData?.sharedWith?.includes(uid)) {
                // Already a collaborator, return success
                return NextResponse.json({ success: true, message: "Already a collaborator" });
            }

            // Add user to project's collaborator lists
            await projectRef.update({
                collaborators: admin.firestore.FieldValue.arrayUnion(userEmail),
                sharedWith: admin.firestore.FieldValue.arrayUnion(uid),
            });

            // Add projectId to user’s projectIds
            await userRef.update({
                projectIds: admin.firestore.FieldValue.arrayUnion(projectId),
            });
        } else if (courseId) {
            const courseRef = adminDb.collection("courses").doc(courseId);
            const courseSnap = await courseRef.get();
            const courseData = courseSnap.data();

            if (courseData?.sharedWith?.includes(uid)) {
                // Already shared with, return success
                return NextResponse.json({ success: true, message: "Already shared with" });
            }

            // Add user to course's sharedWith
            await courseRef.update({
                sharedWith: admin.firestore.FieldValue.arrayUnion(uid),
            });

            // Note: courses don't have collaborators list like projects, so no email addition
        }

        // Add user to invitation's acceptedBy list
        await invitationsRef.doc(invitationSnap.id).update({
            acceptedBy: admin.firestore.FieldValue.arrayUnion(uid),
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
        const invitationSnaps = await adminDb.collection("invitations").where("token", "==", token).get();
        
        if (invitationSnaps.empty) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

        const invitationData = invitationSnaps.docs[0].data();
        const projectId = invitationData.projectId;
        const courseId = invitationData.courseId;
        const createdBy = invitationData.createdBy;

        // Handle friend request token lookup
        if (invitationData.friendRequest === true) {
            const creator = await getUserById(createdBy);
            const createdByName = creator ? creator.displayName : 'Unknown';
            return NextResponse.json({
                title: createdByName,
                type: 'friend' as const,
                createdByName,
                id: createdBy,
                friendRequest: true,
            });
        }

        let title: string;
        let type: 'project' | 'course';
        if (projectId) {
            type = 'project';
            const projectRef = adminDb.collection("projects").doc(projectId);
            const projectSnap = await projectRef.get();
            if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
            title = projectSnap.data()?.title;
        } else if (courseId) {
            type = 'course';
            const courseRef = adminDb.collection("courses").doc(courseId);
            const courseSnap = await courseRef.get();
            if (!courseSnap.exists) return NextResponse.json({ error: "Course not found" }, { status: 404 });
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
