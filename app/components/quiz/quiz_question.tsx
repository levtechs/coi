"use client";

import { useState, useEffect } from "react";
import { QuizQuestion } from "@/lib/types";
import MarkdownArticle from "../md";

interface QuizQuestionElementProps {
    q: QuizQuestion;
    qIndex: number;
    selectedOptions: { [key: number]: number | null };
    handleOptionSelect: (questionIndex: number, optionIndex: number) => void;
    handleFRQResponse?: (questionIndex: number, response: string) => void; // optional callback for FRQs
    showAnswer: boolean | null;
    result: {isCorrect: boolean, score: number, correctAnswer: string, feedback?: string} | null;
}

const QuizQuestionElement = ({
    q,
    qIndex,
    selectedOptions,
    handleOptionSelect,
    handleFRQResponse,
    showAnswer,
    result,
}: QuizQuestionElementProps) => {
    const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
    const [frqResponse, setFrqResponse] = useState<string>("");

    const hasSelected =
        selectedOptions[qIndex] !== undefined && selectedOptions[qIndex] !== null;

    // Shuffle only for MCQs
    useEffect(() => {
        if (q.type === "MCQ") {
            const indices = q.content.options.map((_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            setShuffledIndices(indices);
        }
    }, [q]);

    return (
        <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow-md relative">
            {result && (
                <div className="absolute top-2 right-2 bg-[var(--neutral-300)] px-2 py-1 rounded text-sm">
                    {result.score}/{q.type === "MCQ" ? 1 : 3}
                </div>
            )}
            <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
                <MarkdownArticle markdown={q.question} singleLine={true}/>
            </h2>

            {q.type === "MCQ" ? (
                <div className="space-y-3">
                    {shuffledIndices.map((shuffledIndex) => {
                        const option = q.content.options[shuffledIndex];
                        const isSelected = selectedOptions[qIndex] === shuffledIndex;
                        const isCorrect =
                            shuffledIndex === q.content.correctOptionIndex;

                        let optionClasses =
                            "p-4 border rounded-md cursor-pointer transition-all duration-200";

                        if ((showAnswer === null && hasSelected) || (hasSelected && showAnswer)) {
                            if (isCorrect) {
                                optionClasses +=
                                    " bg-[var(--accent-400)] border-[var(--neutral-500)] text-[var(--neutral-800)] font-semibold";
                            } else if (isSelected) {
                                optionClasses +=
                                    " bg-[var(--error)] border-[var(--neutral-500)] text-[var(--neutral-800)] font-semibold";
                            } else {
                                optionClasses +=
                                    " bg-[var(--neutral-200)] border-[var(--neutral-300)] text-[var(--neutral-500)]";
                            }
                        } else if (showAnswer === false && hasSelected && isSelected) {
                            optionClasses +=
                                " bg-[var(--neutral-300)] border-[var(--neutral-400)]";
                        } else {
                            optionClasses +=
                                " border-[var(--neutral-300)] hover:bg-[var(--neutral-200)]";
                        }

                        return (
                            <div
                                key={shuffledIndex}
                                className={optionClasses}
                                onClick={() =>
                                    handleOptionSelect(qIndex, shuffledIndex)
                                }
                            >
                                <MarkdownArticle markdown={option} singleLine={true}/>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // Render FRQ input
                <div className="space-y-3">
                    <textarea
                        className="w-full p-4 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-400)]"
                        rows={4}
                        placeholder="Type your answer here..."
                        value={frqResponse}
                        onChange={(e) => {
                            const value = e.target.value;
                            setFrqResponse(value);
                            handleFRQResponse?.(qIndex, value);
                        }}
                    />
                     {showAnswer !== false && (
                         <div>
                             <p className="text-sm text-[var(--neutral-600)] italic">
                                 Grading criteria: {q.content.gradingCriteria}
                             </p>
                     {showAnswer === null && (
                         <div className="text-sm text-[var(--neutral-600)] italic">
                             <p>Example answer:</p>
                             <MarkdownArticle markdown={q.content.exampleAnswer} />
                         </div>
                     )}
                         </div>
                     )}
                </div>
            )}
            {result && q.type === "FRQ" && (
                <div className="mt-4 p-4 bg-[var(--neutral-200)] rounded">
                    <h3 className="font-semibold">Example Correct Answer</h3>
                    <div className="mt-1"><MarkdownArticle markdown={result.correctAnswer} /></div>
                    {result.feedback && (
                        <>
                            <h3 className="font-semibold mt-4">Feedback</h3>
                            <div className="mt-1"><MarkdownArticle markdown={result.feedback} /></div>
                        </>
                    )}
                </div>
            )}

        </div>
    );
};

export default QuizQuestionElement;
