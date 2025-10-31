// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAdminUid } from "../../helpers";
import { getUsers } from "../helpers";

/*
 * Retrieves more users for admin with pagination.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const lastId = searchParams.get("lastId") || undefined;

    try {
        await getVerifiedAdminUid(req);
        const users = await getUsers(limit, lastId);
        return NextResponse.json({ users });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }
}