import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Card } from "@/lib/types";

import { getVerifiedUid } from "@/app/api/helpers"

import { createQuizFromCards, writeQuizToDb } from "./helpers";

/**
 * Creates a new quiz given cards
 */
export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const cards = await req.json() as Card[];

    if (!cards) return NextResponse.json({ error: "No cards provided" }, { status: 400 });

    try {
        const quizJson = await createQuizFromCards(cards);
        if (!quizJson) {
            return NextResponse.json({ error: "Gemini API failed" }, { status: 500 });
        }
        const quizId = await writeQuizToDb(quizJson);
        return NextResponse.json({ quizId });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

/** Retrieves a quiz by its ID.
 */
export async function GET(req: NextRequest, { params }: { params: { quizId: string } }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const quizId = params.quizId;
    if (!quizId) return NextResponse.json({ error: "No quiz ID provided" }, { status: 400 });

    try {
        const quizDocRef = doc(db, "quizes", quizId);
        const quizDocSnap = await getDoc(quizDocRef);

        if (!quizDocSnap.exists()) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        const quizData = quizDocSnap.data();
        return NextResponse.json(quizData.quiz);
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}