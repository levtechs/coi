// app/api/quiz/[quizId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUid } from "../../helpers";
import { fetchQuiz, gradeFRQs } from "./helpers";

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
        const quiz = await fetchQuiz(quizId);
        return NextResponse.json(quiz);
    } catch (err) {
        if ((err as Error).message === "Quiz not found") {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

/*
 * Grades a quiz given answers and the quiz ID 
 * Return a list of answers and the score and total score 
 * MCQ are one point each, FRQ are up to three points each 
 *
 * It is more reliable to accept the ID rather than the quiz itself 
 * */
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ quizId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { quizId } = await context.params;
    if (!quizId) return NextResponse.json({ error: "No quiz ID provided" }, { status: 400 });

    const body = await req.json();
    const answers = body.answers; // array of number | string in question order

    try {
        const quiz = await fetchQuiz(quizId);

        let score = 0;
        let total = 0;
        const results = [];
        const frqList = [];

        quiz.questions.forEach((q, qIndex) => {
            if (q.type === "MCQ") {
                total += 1;
                const isCorrect = answers[qIndex] === q.content.correctOptionIndex;
                if (isCorrect) score += 1;
                results[qIndex] = {
                    isCorrect,
                    score: isCorrect ? 1 : 0,
                    correctAnswer: q.content.options[q.content.correctOptionIndex]
                };
            } else {
                total += 3;
                frqList.push({
                    question: q,
                    response: answers[qIndex],
                    index: qIndex
                });
            }
        });

        const frqResults = await gradeFRQs(frqList);

        frqResults.forEach((frqResult, i) => {
            const qIndex = frqList[i].index;
            score += frqResult.score;
            results[qIndex] = {
                isCorrect: frqResult.score === 3,
                score: frqResult.score,
                correctAnswer: quiz.questions[qIndex].content.exampleAnswer,
                feedback: frqResult.feedback
            };
        });

        return NextResponse.json({ results, totalScore: score, maxScore: total });
    } catch (err) {
        if ((err as Error).message === "Quiz not found") {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
