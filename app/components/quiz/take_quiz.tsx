import { useState, useEffect } from "react";

import { useAuth } from "@/lib/AuthContext";

import { Quiz, QuizQuestion } from "@/lib/types";

import { getQuiz } from "@/app/views/quiz";
import LoadingComponent from "../loading";
import QuizForm from "./quiz_form";

interface TakeQuizPageProps {
    quizId: string;
}

const TakeQuizPage = ({ quizId }: TakeQuizPageProps) => {
    const [isLoading, setLoading] = useState<boolean | "error">(true);

    const { user } = useAuth();

    const [quiz, setQuiz] = useState<Quiz | false>(false);


    useEffect(() => {
        setLoading(true);
        if (!user || !quizId) return;

        async function fetchProject() {
            try {
                const fetchedQuiz = await getQuiz(quizId);
                if (!fetchedQuiz) {
                    throw new Error("Quiz not found");
                }
                setQuiz(fetchedQuiz);
                setLoading(false);
            }
            catch (err) {
                console.error("Failed to fetch quiz:", err);
                setLoading("error");
            }
        }

        fetchProject();
    }, [user, quizId]);

    if (isLoading === true) return <LoadingComponent loadingText="Loading quiz..." />;
    if (isLoading === "error" || quiz === false) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--background)] text-[var(--foreground)] text-center">
                <img src="/error.png" alt="Not Found" className="w-64 h-64 mb-8" />
                <p className="text-2xl font-semibold mb-4">Error loading quiz.</p>
                <p className="text-lg mb-6">Please check the quiz ID or try again later.</p>
            </div>
        );
    }

    return (<QuizForm quiz={quiz} />);
};

export default TakeQuizPage;