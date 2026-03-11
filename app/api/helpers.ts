import { adminAuth, adminDb } from "@/lib/firebaseAdmin"; // your admin SDK instance
import { NextRequest } from "next/server";
import { Project, Course } from "@/lib/types";

// Utility function to fetch userRef by email
export async function getUserRefByEmail(email: string) {
    const usersCollection = adminDb.collection("users");
    const q = usersCollection.where("email", "==", email);
    const snap = await q.get();

    if (snap.empty) {
        return null; // user not found
    }

    // Assume email is unique → return first match
    return snap.docs[0].ref;
}

/**
 * Verifies the Firebase ID token in the request Authorization header.
 * Throws an error if token is missing or invalid.
 * @param req NextRequest from Next.js
 * @returns Verified UID string
 */
export async function getVerifiedUid(req: NextRequest): Promise<string> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Missing or invalid Authorization header");
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) throw new Error("No token provided");

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        // Tally user action
        const userDocRef = adminDb.collection("users").doc(uid);
        const userDoc = await userDocRef.get();
        const userData = userDoc.exists ? userDoc.data() || {} : {};
        const now = Date.now();

        // Handle daily actions
        let dailyActions = userData.dailyActions || 0;
        let lastResetDaily = userData.lastResetDaily || 0;
        if (now - lastResetDaily > 24 * 60 * 60 * 1000) {
            dailyActions = 0;
            lastResetDaily = now;
        }
        dailyActions += 1;

        // Handle weekly actions
        let weeklyActions = userData.weeklyActions || 0;
        let lastResetWeekly = userData.lastResetWeekly || 0;
        if (now - lastResetWeekly > 7 * 24 * 60 * 60 * 1000) {
            weeklyActions = 0;
            lastResetWeekly = now;
        }
        weeklyActions += 1;

        const totalActions = (userData.actions || 0) + 1;

        await userDocRef.set({
            actions: totalActions,
            dailyActions,
            lastResetDaily,
            weeklyActions,
            lastResetWeekly
        }, { merge: true });

        return uid;
    } catch {
        throw new Error("Invalid or expired token");
    }
}

/**
 * Verifies the Firebase ID token and checks if the user is an admin.
 * Throws an error if token is missing/invalid or user is not admin.
 * @param req NextRequest from Next.js
 * @returns Verified admin UID string
 */
export async function getVerifiedAdminUid(req: NextRequest): Promise<string> {
    const uid = await getVerifiedUid(req);
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists || !userDoc.data()?.admin) {
        throw new Error("Access denied: Admin privileges required");
    }
    return uid;
}

/**
 * Verifies that the user has access to a specific project.
 * Throws an error if the user is not authenticated or doesn't have access.
 * @param req NextRequest from Next.js
 * @param projectId ID of the project to check
 * @param allowPublic Whether to allow access to public projects
 * @returns Verified UID string
 */
export async function getVerifiedProjectAccess(req: NextRequest, projectId: string, allowPublic: boolean = false): Promise<string> {
    const uid = await getVerifiedUid(req);
    
    // Fetch user email for collaborator check
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userEmail = userDoc.exists ? userDoc.data()?.email : null;

    const projectDoc = await adminDb.collection("projects").doc(projectId).get();

    if (!projectDoc.exists) {
        throw new Error("Project not found");
    }

    const projectData = projectDoc.data() as Project;
    const isOwner = projectData.ownerId === uid;
    const isShared = projectData.sharedWith?.includes(uid);
    const isCollaborator = userEmail && projectData.collaborators?.includes(userEmail);
    const isPublic = allowPublic && projectData.public === true;

    if (!isOwner && !isShared && !isCollaborator && !isPublic) {
        throw new Error("Access denied: You do not have permission to access this project");
    }

    return uid;
}

/**
 * Verifies that the user has access to a specific course.
 * Throws an error if the user is not authenticated or doesn't have access.
 * @param req NextRequest from Next.js
 * @param courseId ID of the course to check
 * @param allowPublic Whether to allow access to public courses
 * @returns Verified UID string
 */
export async function getVerifiedCourseAccess(req: NextRequest, courseId: string, allowPublic: boolean = false): Promise<string> {
    const uid = await getVerifiedUid(req);
    const courseDoc = await adminDb.collection("courses").doc(courseId).get();

    if (!courseDoc.exists) {
        throw new Error("Course not found");
    }

    const courseData = courseDoc.data() as Course;
    const isOwner = courseData.ownerId === uid;
    const isShared = courseData.sharedWith?.includes(uid);
    const isPublic = allowPublic && courseData.public === true;

    if (!isOwner && !isShared && !isPublic) {
        throw new Error("Access denied: You do not have permission to access this course");
    }

    return uid;
}
