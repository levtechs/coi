"use client";

import { useState } from "react";
import { Quiz, QuizQuestion } from "@/lib/types";
import QuizQuestionElement from "./quiz_question";
import Button from "../button";

interface QuizFormProps {
    quiz: Quiz;
    isGraded: boolean;
}

const QuizForm = ({ quiz, isGraded }: QuizFormProps) => {
    // State to track the user's selected option for each question.
    // The key is the question index, and the value is the selected option index.
    const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: number | null }>({});
    const [submitted, setSubmitted] = useState(false);

    // This handler updates the state with the user's selection for a specific question.
    const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
        // Prevent changing the answer once it has been selected, unless showAnswer is false.
        const showAnswer = isGraded ? submitted : null;
        if (selectedOptions[questionIndex] !== undefined && showAnswer !== false) return;
        
        setSelectedOptions(prev => ({
            ...prev,
            [questionIndex]: optionIndex,
        }));
    };

    return (
        <div className="bg-[var(--neutral-100)] rounded-lg shadow-lg max-h-full mt-4 mb-4 mr-4 ml-4 overflow-y-auto p-6 sm:p-12 text-[var(--foreground)]">
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
                        showAnswer={isGraded ? submitted : null}
                    />
                ))}
             </div>
             {isGraded && (
                 <div className="flex justify-center mt-8">
                     <Button
                         color={submitted ? "var(--neutral-400)" : "var(--accent-400)"}
                         onClick={submitted ? () => {} : () => { setSubmitted(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                     >
                         {submitted ? "Submitted" : "Submit Quiz"}
                     </Button>
                 </div>
             )}
        </div>
    );
};

export default QuizForm;
