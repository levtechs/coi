"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Suspense } from "react";
import CreateQuizPage from "../components/quiz/create_quiz";
import LoadingComponent from "../components/loading";
import Error from "../components/error";

const QuizPage = () => {
    return (
        <Suspense fallback={<LoadingComponent/>}>
            <QuizPageInner />
        </Suspense>
    );
};

export default QuizPage;

// inner client component
const QuizPageInner = () => {
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");

    useEffect(() => {
        document.title = "Create Quiz - coi";
    }, []);

    if (!projectId) return (<Error h2="No Quiz ID provided." p="Please check the URL or try again later."/>)

    return <CreateQuizPage projectId={projectId} />;
};
