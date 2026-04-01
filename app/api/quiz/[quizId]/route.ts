import { NextRequest, NextResponse } from "next/server";
import { assertCourseAccessByUid, assertProjectAccessByUid, getVerifiedUid } from "../../helpers";
import { fetchQuiz, fetchQuizAttemptsForUser, gradeFRQs, summarizeAttempts } from "./helpers";
import { toQuizAttemptSummary, writeQuizAttempt } from "../helpers";
import { recordQuizAttemptForCourseProgress } from "@/app/api/courses/progress_helpers";
import { QuizQuestion } from "@/lib/types/quiz";
/*
 * Retrieves a quiz by its ID.
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ quizId: string }> }
) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { quizId } = await context.params;
    if (!quizId) return NextResponse.json({ error: "No quiz ID provided" }, { status: 400 });

    try {
        const quiz = await fetchQuiz(quizId);
        if (quiz.courseId) {
            await assertCourseAccessByUid(uid, quiz.courseId, true);
        }
        if (quiz.projectId) {
            await assertProjectAccessByUid(uid, quiz.projectId, true);
        }

        const attempts = await fetchQuizAttemptsForUser(quizId, uid);
        const attemptSummaries = attempts.map((attempt) => toQuizAttemptSummary(attempt));
        const { latestAttempt, bestAttempt } = summarizeAttempts(attempts);
        quiz.attempts = attemptSummaries;
        quiz.latestAttempt = latestAttempt;
        quiz.bestAttempt = bestAttempt;
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
    const elapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : undefined;

    try {
        const quiz = await fetchQuiz(quizId);
        if (quiz.courseId) {
            await assertCourseAccessByUid(uid, quiz.courseId, true);
        }
        if (quiz.projectId) {
            await assertProjectAccessByUid(uid, quiz.projectId, true);
        }

        let score = 0;
        let total = 0;
        const results: {isCorrect: boolean, score: number, correctAnswer: string, feedback?: string}[] = [];
        const frqList: {question: QuizQuestion, response: string, index: number}[] = [];

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
                correctAnswer: (quiz.questions[qIndex].content as {gradingCriteria: string, exampleAnswer: string}).exampleAnswer,
                feedback: frqResult.feedback
            };
        });

        const attempt = await writeQuizAttempt(quiz, uid, answers, results, score, total, elapsedMs);
        const attemptSummary = toQuizAttemptSummary(attempt);

        if (quiz.courseId) {
            await recordQuizAttemptForCourseProgress(quiz, uid, attemptSummary);
        }

        return NextResponse.json({ results, totalScore: score, maxScore: total, attempt: attemptSummary });
    } catch (err) {
        if ((err as Error).message === "Quiz not found") {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
