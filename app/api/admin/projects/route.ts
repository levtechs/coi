// app/api/admin/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAdminUid } from "../../helpers";
import { getProjects } from "../helpers";

/*
 * Retrieves more projects for admin with pagination.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const lastId = searchParams.get("lastId") || undefined;

    try {
        await getVerifiedAdminUid(req);
        const projects = await getProjects(limit, lastId);
        return NextResponse.json({ projects });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }
}