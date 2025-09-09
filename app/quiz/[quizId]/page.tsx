"use client";

import Image from "next/image";

import TakeQuizPage from "@/app/components/quiz/take_quiz";
import { useParams } from "next/navigation";

const QuizPage = () => {
    const params = useParams();
    const quizId = Array.isArray(params?.quizId) ? params?.quizId[0] : params?.quizId;

    if (!quizId) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
                <Image src="/error.png" alt="Not Found" width={200} height={200} className="mb-8" />
                <p className="text-2xl font-semibold mb-4">No Quiz ID provided.</p>
                <p className="text-lg mb-6">Please check the URL or try again later.</p>
            </div>
        );
    }

    return (
        <TakeQuizPage quizId={quizId!} />
    )
}

export default QuizPage