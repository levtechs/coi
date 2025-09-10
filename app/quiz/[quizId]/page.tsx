"use client";

import TakeQuizPage from "@/app/components/quiz/take_quiz";
import { useParams } from "next/navigation";
import Error from "@/app/components/error";

const QuizPage = () => {
    const params = useParams();
    const quizId = Array.isArray(params?.quizId) ? params?.quizId[0] : params?.quizId;

    if (!quizId) {
        return (<Error h2="No Quiz ID provided." p="Please check the URL or try again later."/>)
    }

    return (
        <TakeQuizPage quizId={quizId!} />
    )
}

export default QuizPage