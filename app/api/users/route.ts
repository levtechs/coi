// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function GET(req: NextRequest) {
    const email = req.url ? new URL(req.url).searchParams.get("email") : null;
    if (!email) {
        return NextResponse.json({ error: "No email provided" }, { status: 400 });
    }

    try {
        const usersCol = collection(db, "users");
        const q = query(usersCol, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userDoc = querySnapshot.docs[0];
        return NextResponse.json({ uid: userDoc.id });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
