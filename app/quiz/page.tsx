// app/quiz/page.tsx
"use client";

import { useSearchParams } from "next/navigation";

import { Suspense } from "react";
import CreateQuizPage from "../components/quiz/create_quiz";
import LoadingComponent from "../components/loading";

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

    if (!projectId) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p>No Quiz ID provided</p>
            </div>
        );
    }

    return <CreateQuizPage projectId={projectId} />;
};
