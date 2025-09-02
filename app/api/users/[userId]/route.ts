import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { getVerifiedUid } from "../../helpers";

import { User } from "@/lib/types";

// return user data from user id
export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { userId } = await context.params;

    try {
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const data = snap.data();
        const user: User = {
            id: userId,
            email: data.email,
            displayName: data.displayName
        };

        return NextResponse.json(user);
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
