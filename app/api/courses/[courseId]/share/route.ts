import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";
import { getVerifiedUid } from "../../../helpers";

// POST: Add a user to a course by userId
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // Fetch the course
        const courseRef = adminDb.collection("courses").doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();
        if (!courseData) return NextResponse.json({ error: "Course data is empty" }, { status: 404 });

        // Only owner can add users
        if (courseData.ownerId !== uid) {
            return NextResponse.json({ error: "Only the course owner can add users" }, { status: 403 });
        }

        // Check if user exists
        const userRef = adminDb.collection("users").doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if already shared
        if (courseData.sharedWith && courseData.sharedWith.includes(userId)) {
            return NextResponse.json({ error: "User already has access" }, { status: 409 });
        }

        // Add user to course sharedWith
        await courseRef.update({
            sharedWith: admin.firestore.FieldValue.arrayUnion(userId),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error sharing course:", error);
        return NextResponse.json({ error: "Failed to share course" }, { status: 500 });
    }
}
