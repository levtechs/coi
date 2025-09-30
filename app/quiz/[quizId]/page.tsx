"use client";

import TakeQuizPage from "@/app/components/quiz/take_quiz";
import { useParams } from "next/navigation";
import Error from "@/app/components/error";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getQuiz } from "@/app/views/quiz";
import { Quiz } from "@/lib/types";
import LoadingComponent from "@/app/components/loading";

const QuizPage = () => {
    const params = useParams();
    const quizId = Array.isArray(params?.quizId) ? params?.quizId[0] : params?.quizId;
    const { user } = useAuth();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [isLoading, setLoading] = useState<boolean | "error">(true);

    useEffect(() => {
        if (!user || !quizId) return;

        async function fetchQuiz() {
            try {
                const fetchedQuiz = await getQuiz(quizId as string);
                setQuiz(fetchedQuiz);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch quiz:", err);
                setLoading("error");
            }
        }

        fetchQuiz();
    }, [user, quizId]);

    useEffect(() => {
        if (quiz) {
            const shortenedTitle = quiz.title.length > 20 ? quiz.title.substring(0, 20) + "..." : quiz.title;
            document.title = `${shortenedTitle} - coi`;
        }
    }, [quiz]);

    if (!quizId) {
        return (<Error h2="No Quiz ID provided." p="Please check the URL or try again later."/>)
    }

    if (isLoading === true) return <LoadingComponent loadingText="Loading quiz..." />;
    if (isLoading === "error" || quiz === null) return (<Error h2="Error loading quiz." p="Please check the quiz ID or try again later." />);

    return (
        <TakeQuizPage quiz={quiz} />
    )
}

export default QuizPage