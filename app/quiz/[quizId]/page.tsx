"use client";

import TakeQuizPage from "@/app/components/quiz/take_quiz";
import { useParams } from "next/navigation";

const QuizPage = () => {
    const params = useParams();
    const quizId = Array.isArray(params?.quizId) ? params?.quizId[0] : params?.quizId;

    return (
        <TakeQuizPage quizId={quizId!} />
    )
}

export default QuizPage