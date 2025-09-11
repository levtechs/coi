import { NextRequest, NextResponse } from "next/server";

import { fetchCardsFromProject } from "../helpers";
import { getVerifiedUid } from "@/app/api/helpers";

export async function GET(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    try {
        const cards = await fetchCardsFromProject(projectId);
        return NextResponse.json(cards);

    } catch (err) {
        console.error("Error fetching cards:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
