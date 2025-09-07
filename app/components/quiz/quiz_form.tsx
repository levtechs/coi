"use client";

import { useState } from "react";
import { Quiz, QuizQuestion } from "@/lib/types";
import QuizQuestionElement from "./quiz_question";

interface QuizFormProps {
    quiz: Quiz;
}

const QuizForm = ({ quiz }: QuizFormProps) => {
    // State to track the user's selected option for each question.
    // The key is the question index, and the value is the selected option index.
    const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: number | null }>({});

    // This handler updates the state with the user's selection for a specific question.
    const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
        // Prevent changing the answer once it has been selected.
        if (selectedOptions[questionIndex] !== undefined) return;
        
        setSelectedOptions(prev => ({
            ...prev,
            [questionIndex]: optionIndex,
        }));
    };

    return (
        <div className="bg-[var(--neutral-100)] rounded-lg shadow-lg max-h-screen overflow-y-auto p-6 sm:p-12 text-[var(--foreground)]">
            <h1 className="text-4xl font-bold mb-2 text-center text-[var(--neutral-800)]">{quiz.title}</h1>
            <p className="text-center mb-10 text-[var(--neutral-600)]">{quiz.description}</p>

            <div className="space-y-12">
                {quiz.questions.map((q: QuizQuestion, qIndex: number) => (
                    <QuizQuestionElement
                        key={qIndex}
                        q={q}
                        qIndex={qIndex}
                        selectedOptions={selectedOptions}
                        handleOptionSelect={handleOptionSelect}
                    />
                ))}
            </div>
        </div>
    );
};

export default QuizForm;
