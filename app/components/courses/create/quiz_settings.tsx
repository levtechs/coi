"use client";

import { FiLoader } from "react-icons/fi";
import { NewCard, QuizSettings } from "@/lib/types";
import Button from "../../button";

interface QuizSettingsComponentProps {
    cards: NewCard[];
    selectedCards: boolean[];
    setSelectedCards: (newSelected: boolean[]) => void;
    quizSettings: QuizSettings;
    setQuizSettings: (settings: QuizSettings) => void;
    quizError: string | null;
    setQuizError: (error: string | null) => void;
    onCreate: () => void;
    isCreating: boolean | string;
}

export default function QuizSettingsComponent({
    cards,
    selectedCards,
    setSelectedCards,
    quizSettings,
    setQuizSettings,
    quizError,
    setQuizError,
    onCreate,
    isCreating,
}: QuizSettingsComponentProps) {
    return (
        <>
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-2">Quiz Settings</h3>
            <div className="flex flex-row gap-2 mb-2">
                <button
                    className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${quizSettings.includeMCQ ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                    onClick={() => {setQuizSettings({...quizSettings, includeMCQ: !quizSettings.includeMCQ}); setQuizError(null);}}
                >
                    Include multiple choice questions
                </button>
                <button
                    className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${quizSettings.includeFRQ ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                    onClick={() => {setQuizSettings({...quizSettings, includeFRQ: !quizSettings.includeFRQ}); setQuizError(null);}}
                >
                    Include free response questions
                </button>
            </div>
            <div className="mb-2">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Select Cards to Include</label>
                <div className="flex flex-wrap gap-2">
                    {cards.map((card, index) => (
                        <button
                            key={index}
                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${selectedCards[index] ? 'bg-[var(--neutral-400)] text-[var(--foreground)]' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                            onClick={() => {
                                const newSelected = [...selectedCards];
                                newSelected[index] = !newSelected[index];
                                setSelectedCards(newSelected);
                            }}
                        >
                            {card.title || `Card ${index + 1}`}
                        </button>
                    ))}
                </div>
                <p className="text-sm text-[var(--neutral-600)] mt-2">{selectedCards.filter(Boolean).length} cards selected</p>
            </div>
            {quizError && <p className="text-[var(--error)] text-sm mb-2">{quizError}</p>}
            <hr className="my-4 border-[var(--neutral-300)]" />
            <Button
                color="var(--accent-500)"
                onClick={onCreate}
            >
                Create Quiz
            </Button>
            {isCreating === true && <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />}
            {typeof isCreating === 'string' && (
                <Button
                    color="var(--accent-400)"
                    onClick={() => window.open(`/quiz/${isCreating}`, '_blank')}
                >
                    View Quiz
                </Button>
            )}
        </>
    );
}