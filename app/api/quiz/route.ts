import { NextRequest, NextResponse } from "next/server";

import { Card } from "@/lib/types";

import { getVerifiedUid } from "@/app/api/helpers"

import { createQuizFromCards } from "./helpers";

/**
 * Creates a new quiz given cards
 */
export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const cards = await req.json() as Card[];

    if (!cards) return NextResponse.json({ error: "No cards provided" }, { status: 400 });

    try {
        const quizId = await createQuizFromCards(cards);
        return NextResponse.json({ quizId });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}