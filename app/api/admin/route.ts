// app/api/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAdminUid } from "../helpers";
import { getProjects, getUsers } from "./helpers";

/*
 * Retrieves initial 10 projects and 10 users for admin.
 */
export async function GET(req: NextRequest) {
    try {
        await getVerifiedAdminUid(req);
        const [projects, users] = await Promise.all([
            getProjects(1000), // Fetch more projects for accurate counts
            getUsers(10),
        ]);
        return NextResponse.json({ projects, users });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }
}