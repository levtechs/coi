import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../../helpers";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

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
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const courseData = courseSnap.data();

        // Only owner can add users
        if (courseData.ownerId !== uid) {
            return NextResponse.json({ error: "Only the course owner can add users" }, { status: 403 });
        }

        // Check if user exists
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if already shared
        if (courseData.sharedWith && courseData.sharedWith.includes(userId)) {
            return NextResponse.json({ error: "User already has access" }, { status: 409 });
        }

        // Add user to course sharedWith
        await updateDoc(courseRef, {
            sharedWith: arrayUnion(userId),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error sharing course:", error);
        return NextResponse.json({ error: "Failed to share course" }, { status: 500 });
    }
}
