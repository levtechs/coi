// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "../../helpers";
import { getUsers } from "../helpers";

function checkAdminPassword(req: NextRequest) {
    const password = req.headers.get('X-Admin-Password');
    if (password !== process.env.ADMIN_PASSWORD) {
        throw new Error("Invalid admin password");
    }
}

/*
 * Retrieves more users for admin with pagination.
 */
export async function GET(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const lastId = searchParams.get("lastId") || undefined;

    try {
        checkAdminPassword(req);
        const users = await getUsers(limit, lastId);
        return NextResponse.json({ users });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}