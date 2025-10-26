import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "@/app/api/helpers";
import { getUserPreferences } from "../helpers";

export async function GET(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    try {
        const preferences = await getUserPreferences(uid);
        return NextResponse.json({ preferences });
    } catch (err) {
        console.error("/api/chat/preferences GET error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}