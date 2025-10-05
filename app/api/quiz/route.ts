import { NextRequest, NextResponse } from "next/server";

import { Card, QuizSettings } from "@/lib/types";

import { getVerifiedUid } from "@/app/api/helpers"

import { createQuizFromCards, writeQuizToDb } from "./helpers";

/**
 * Creates a new quiz given cards
 */
export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { cards, quizSettings, projectId } = await req.json() as { cards: Card[]; quizSettings: QuizSettings, projectId: string };

    if (!cards) return NextResponse.json({ error: "No cards provided" }, { status: 400 });

    try {
        const quizJson = await createQuizFromCards(cards, quizSettings);
        if (!quizJson) {
            return NextResponse.json({ error: "Gemini API failed" }, { status: 500 });
        }
        const quizId = await writeQuizToDb(quizJson, projectId);
        return NextResponse.json({ quizId });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

