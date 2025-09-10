import { useState, useEffect } from "react";

import { useAuth } from "@/lib/AuthContext";

import { Quiz } from "@/lib/types";

import { getQuiz } from "@/app/views/quiz";
import LoadingComponent from "../loading";
import QuizForm from "./quiz_form";
import Error from "../error";

interface TakeQuizPageProps {
    quizId: string;
}

const TakeQuizPage = ({ quizId }: TakeQuizPageProps) => {
    const [isLoading, setLoading] = useState<boolean | "error">(true);

    const { user } = useAuth();

    const [quiz, setQuiz] = useState<Quiz | null>(null);


    useEffect(() => {
        setLoading(true);
        if (!user || !quizId) return;

        async function fetchQuiz() {
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
    }, [user, quizId]);

    if (isLoading === true) return <LoadingComponent loadingText="Loading quiz..." />;
    if (isLoading === "error" || quiz === null) return (<Error h2="Error loading quiz." p="Please check the quiz ID or try again later." />);

    return (<QuizForm quiz={quiz} />);
};

export default TakeQuizPage;