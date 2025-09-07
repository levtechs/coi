// app/api/quiz/[quizId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getVerifiedUid } from "../../helpers";

/*
 * Retrieves a quiz by its ID.
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ quizId: string }> } // <--- correct type
) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { quizId } = await context.params; // <--- await here
    if (!quizId) return NextResponse.json({ error: "No quiz ID provided" }, { status: 400 });

    try {
        const quizDocRef = doc(db, "quizzes", quizId);
        const quizDocSnap = await getDoc(quizDocRef);

        if (!quizDocSnap.exists()) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        const quizData = quizDocSnap.data();
        return NextResponse.json({ id: quizDocSnap.id, ...quizData });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
