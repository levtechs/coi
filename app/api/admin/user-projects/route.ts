import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "../../helpers";
import { getProjectsForUser, checkAdminPassword } from "../helpers";

export async function GET(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    try {
        checkAdminPassword(req);
        const projects = await getProjectsForUser(userId);
        return NextResponse.json({ projects });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}