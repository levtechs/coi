import { useState, useEffect } from "react";

import { useAuth } from "@/lib/AuthContext";

import { Quiz } from "@/lib/types";

import { getQuiz } from "@/app/views/quiz";
import LoadingComponent from "../loading";
import QuizForm from "./quiz_form";
import Error from "../error";
import Button from "../button";

interface TakeQuizPageProps {
    quizId?: string;
    quiz?: Quiz;
}

const TakeQuizPage = ({ quizId, quiz: providedQuiz }: TakeQuizPageProps) => {
    const [isLoading, setLoading] = useState<boolean | "error">(providedQuiz ? false : true);

    const { user } = useAuth();

    const [quiz, setQuiz] = useState<Quiz | null>(providedQuiz || null);
    const [isGraded, setIsGraded] = useState<boolean | null>(null);


    useEffect(() => {
        if (providedQuiz) return; // Already have quiz

        setLoading(true);
        if (!user || !quizId) return;

        async function fetchQuiz() {
            if (!quizId) return;
            try {
                const fetchedQuiz = await getQuiz(quizId);
                setQuiz(fetchedQuiz);
                setLoading(false);
            }
            catch (err) {
                console.error("Failed to fetch quiz:", err);
                setLoading("error");
            }
        }

        fetchQuiz();
    }, [user, quizId, providedQuiz]);

    if (isLoading === true) return <LoadingComponent loadingText="Loading quiz..." />;
    if (isLoading === "error" || quiz === null) return (<Error h2="Error loading quiz." p="Please check the quiz ID or try again later." />);

    if (isGraded === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-100)]">
                <div className="p-6 w-3xl bg-[var(--neutral-200)] rounded-md justify-center">
                    <h1 className="font-bold text-2xl mb-4">{quiz.title}</h1>
                    <p className="mb-6">{quiz.description}</p>
                    <p className="mb-6 italic">{quiz.questions.length} questions</p>
                    <div className="flex gap-4 justify-center">
                        <Button color="var(--neutral-500)" onClick={() => setIsGraded(false)}>Preview Quiz</Button>
                        <Button color="var(--accent-400)" onClick={() => setIsGraded(true)}>Take Quiz</Button>
                    </div>
                </div>
            </div>
        );
    } else {
        return <QuizForm quiz={quiz} isGraded={isGraded} />;
    }
};

export default TakeQuizPage;