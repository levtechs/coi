// app/api/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "../helpers";
import { getProjects, getUsers } from "./helpers";

function checkAdminPassword(req: NextRequest) {
    const password = req.headers.get('X-Admin-Password');
    if (password !== process.env.ADMIN_PASSWORD) {
        throw new Error("Invalid admin password");
    }
}

/*
 * Retrieves initial 10 projects and 10 users for admin.
 */
export async function GET(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    try {
        checkAdminPassword(req);
        const [projects, users] = await Promise.all([
            getProjects(1000), // Fetch more projects for accurate counts
            getUsers(10),
        ]);
        return NextResponse.json({ projects, users });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}