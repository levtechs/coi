import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAdminUid } from "../../helpers";
import { getProjectsForUser } from "../helpers";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    try {
        await getVerifiedAdminUid(req);
        const projects = await getProjectsForUser(userId);
        return NextResponse.json({ projects });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }
}