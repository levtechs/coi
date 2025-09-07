"use client";

import { useState, useEffect } from "react";
import { QuizQuestion } from "@/lib/types";
import MarkdownArticle from "../md";

interface QuizQuestionElementProps {
    q: QuizQuestion;
    qIndex: number;
    selectedOptions: { [key: number]: number | null };
    handleOptionSelect: (questionIndex: number, optionIndex: number) => void;
}

const QuizQuestionElement = ({ q, qIndex, selectedOptions, handleOptionSelect }: QuizQuestionElementProps) => {
    const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
    const hasSelected = selectedOptions[qIndex] !== undefined && selectedOptions[qIndex] !== null;

    // Shuffle options once when the question is first rendered
    useEffect(() => {
        const indices = q.options.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setShuffledIndices(indices);
    }, [q.options]);

    return (
        <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
                <MarkdownArticle markdown={q.question} />
            </h2>
            <div className="space-y-3">
                {shuffledIndices.map((shuffledIndex) => {
                    const option = q.options[shuffledIndex];
                    const isSelected = selectedOptions[qIndex] === shuffledIndex;
                    const isCorrect = shuffledIndex === q.correctOptionIndex;

                    let optionClasses = "p-4 border rounded-md cursor-pointer transition-all duration-200";

                    if (hasSelected) {
                        if (isCorrect) {
                            optionClasses += " bg-[var(--accent-400)] border-[var(--neutral-500)] text-[var(--neutral-800)] font-semibold";
                        } else if (isSelected) {
                            optionClasses += " bg-[var(--error)] border-[var(--neutral-500)] text-[var(--neutral-800)] font-semibold";
                        } else {
                            optionClasses += " bg-[var(--neutral-200)] border-[var(--neutral-300)] text-[var(--neutral-500)]";
                        }
                    } else {
                        optionClasses += " border-[var(--neutral-300)] hover:bg-[var(--neutral-200)]";
                    }

                    return (
                        <div
                            key={shuffledIndex}
                            className={optionClasses}
                            onClick={() => handleOptionSelect(qIndex, shuffledIndex)}
                        >
                            <MarkdownArticle markdown={option} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuizQuestionElement;
