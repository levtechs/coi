// app/api/star/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getVerifiedUid } from "../helpers";

export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
        return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const starCode = process.env.STAR_UPGRADE_CODE;
    if (!starCode) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    if (code !== starCode) {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, { starUser: true });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to upgrade user:", err);
        return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
    }
}