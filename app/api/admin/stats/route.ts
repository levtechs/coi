// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAdminUid } from "../../helpers";
import { getAdminStats } from "../helpers";

/*
 * Retrieves admin stats.
 */
export async function GET(req: NextRequest) {
    try {
        await getVerifiedAdminUid(req);
        const stats = await getAdminStats();
        return NextResponse.json(stats);
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }
}