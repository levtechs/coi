import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { getVerifiedUid } from "../../helpers";
import { getUserById } from "../helpers";
import { SignUpResponses } from "@/lib/types";

// return user data from user id
export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { userId } = await context.params;

    try {
        const user = await getUserById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Return user info including sign-up responses for dashboard checks
        const userData = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            starUser: user.starUser,
            signUpResponses: user.signUpResponses
        };

        return NextResponse.json(userData);
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// Update user sign-up responses
export async function PATCH(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await context.params;

    // Users can only update their own data
    if (uid !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { signUpResponses } = body;

        if (!signUpResponses) {
            return NextResponse.json({ error: "signUpResponses is required" }, { status: 400 });
        }

        // Update the user document with sign-up responses
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            signUpResponses: signUpResponses as SignUpResponses
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error updating user sign-up responses:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
