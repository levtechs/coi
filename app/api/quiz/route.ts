import { NextRequest, NextResponse } from "next/server";

import { NewCard } from "@/lib/types/cards";
import { QuizSettings } from "@/lib/types/quiz";

import { getVerifiedUid, getVerifiedProjectAccess } from "@/app/api/helpers"

import { createQuizFromCards, writeQuizToDb } from "./helpers";

/**
 * Creates a new quiz given cards
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { cards, quizSettings, projectId } = body as { cards: NewCard[]; quizSettings: QuizSettings, projectId?: string };

        if (!cards) return NextResponse.json({ error: "No cards provided" }, { status: 400 });

        if (projectId) {
            await getVerifiedProjectAccess(req, projectId);
        } else {
            await getVerifiedUid(req);
        }
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

