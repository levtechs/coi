// app/api/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
    const { userId } = params;

    try {
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const data = snap.data();
        return NextResponse.json({ email: data.email });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
