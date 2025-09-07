// app/quiz/page.tsx
"use client";

import { useSearchParams } from "next/navigation";

import CreateQuizPanel from "../components/editor/quiz/create_quiz";

const QuizPage = () => {
    const searchParams = useSearchParams();

    const projectId = searchParams.get("projectId");

    if (!projectId) {
        return (
            <p>Go to a project to create a quiz</p>

        )
    }

    return (
        <CreateQuizPanel projectId={projectId} />
    );
}

export default QuizPage