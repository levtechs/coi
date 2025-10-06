"use client";

import { useState } from "react";
import { Quiz, QuizQuestion } from "@/lib/types";
import QuizQuestionElement from "./quiz_question";
import Button from "../button";
import LoadingComponent from "../loading";
import { gradeQuiz } from "@/app/views/quiz";

interface QuizFormProps {
    quiz: Quiz;
    isGraded: boolean;
}

const QuizForm = ({ quiz, isGraded }: QuizFormProps) => {
    // State to track the user's selected option for each question.
    // The key is the question index, and the value is the selected option index.
    const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: number | null }>({});
    const [frqResponses, setFrqResponses] = useState<{ [key: number]: string }>({});
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [results, setResults] = useState<{isCorrect: boolean, score: number, correctAnswer: string, feedback?: string}[] | null>(null);
    const [isGrading, setIsGrading] = useState(false);

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

    const handleFRQResponse = (questionIndex: number, response: string) => {
        setFrqResponses(prev => ({
            ...prev,
            [questionIndex]: response,
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
                        handleFRQResponse={handleFRQResponse}
                        showAnswer={isGraded ? submitted : null}
                        result={submitted && results ? results[qIndex] : null}
                    />
                ))}
             </div>
             {isGraded && (
                 <div className="flex justify-between items-center mt-8">
                     <div className="flex items-center gap-4">
                         {submitted ? (
                             <Button color="var(--accent-400)" onClick={() => window.location.reload()}>
                                 Try Again
                             </Button>
                         ) : isGrading ? (
                             <LoadingComponent loadingText="Grading quiz. This may take a second." small={true} />
                         ) : (
                             <Button
                                 color="var(--accent-400)"
                                 onClick={async () => {
                                     // Check if all questions are answered
                                     let allAnswered = true;
                                     quiz.questions.forEach((q, qIndex) => {
                                         if (q.type === "MCQ") {
                                             if (selectedOptions[qIndex] === undefined || selectedOptions[qIndex] === null) {
                                                 allAnswered = false;
                                             }
                                         } else if (q.type === "FRQ") {
                                             if (!frqResponses[qIndex] || frqResponses[qIndex].trim() === "") {
                                                 allAnswered = false;
                                             }
                                         }
                                     });
                                     if (!allAnswered) {
                                         setSubmitError("Please answer all questions before submitting.");
                                         return;
                                     }
                                     setSubmitError(null);
                                     setIsGrading(true);
                                     const answers = quiz.questions.map((q, i) => q.type === "MCQ" ? selectedOptions[i] : frqResponses[i]) as (number | string)[];
                                     const grading = await gradeQuiz(quiz.id!, answers);
                                     setResults(grading.results);
                                     setSubmitted(true);
                                     setIsGrading(false);
                                     window.scrollTo({ top: 0, behavior: 'smooth' });
                                 }}
                             >
                                 Submit Quiz
                             </Button>
                         )}
                         {submitError && <p className="text-[var(--error)]">{submitError}</p>}
                     </div>
                     <div>
                         {submitted ? (
                             <p>Score: {results ? results.reduce((acc, r) => acc + r.score, 0) : 0}/{quiz.questions.reduce((acc, q) => acc + (q.type === "MCQ" ? 1 : 3), 0)}</p>
                         ) : (
                             <p>Questions attempted: {quiz.questions.reduce((acc, q, i) => {
                                 if (q.type === "MCQ" && selectedOptions[i] !== undefined && selectedOptions[i] !== null) acc++;
                                 if (q.type === "FRQ" && frqResponses[i] && frqResponses[i].trim() !== "") acc++;
                                 return acc;
                             }, 0)}/{quiz.questions.length}</p>
                         )}
                     </div>
                 </div>
             )}

        </div>
    );
};

export default QuizForm;
