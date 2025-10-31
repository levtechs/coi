"use client";

import { useState, useEffect } from "react";
import { FiChevronDown, FiChevronRight, FiLoader } from "react-icons/fi";
import Button from "../../button";

import FastCreatePopup from "./fast_create_popup";
import QuizSettingsComponent from "./quiz_settings";
import { CourseLesson, Card, NewCard, QuizSettings } from "@/lib/types";
import { createQuiz, getQuiz } from "@/app/views/quiz";

type LessonForm = Omit<CourseLesson, "id" | "courseId" | "index" | "cardsToUnlock"> & { cardsToUnlock: NewCard[] };

interface LessonComponentProps {
    lesson: LessonForm;
    index: number;
    collapsed: boolean;
    collapsedCards: { [lessonIndex: number]: boolean[] };
    onToggleCollapse: (index: number) => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, field: "title" | "description" | "content", value: string) => void;
    onAddCard: (lessonIndex: number) => void;
    onToggleCardCollapse: (lessonIndex: number, cardIndex: number) => void;
    onRemoveCard: (lessonIndex: number, cardIndex: number) => void;
    onUpdateCard: (lessonIndex: number, cardIndex: number, field: "title", value: string) => void;
    onAddDetail: (lessonIndex: number, cardIndex: number) => void;
    onRemoveDetail: (lessonIndex: number, cardIndex: number, detailIndex: number) => void;
    onUpdateDetail: (lessonIndex: number, cardIndex: number, detailIndex: number, value: string) => void;
    onGenerateLesson: (text: string) => Promise<void>;
    onAddQuizId: (quizId: string) => void;
}

export default function LessonComponent({
    lesson,
    index,
    collapsed,
    collapsedCards,
    onToggleCollapse,
    onRemove,
    onUpdate,
    onAddCard,
    onToggleCardCollapse,
    onRemoveCard,
    onUpdateCard,
    onAddDetail,
    onRemoveDetail,
    onUpdateDetail,
    onGenerateLesson,
    onAddQuizId,
}: LessonComponentProps) {
    const [isFastCreatePopupOpen, setIsFastCreatePopupOpen] = useState(false);
    const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
    const [showQuizSettings, setShowQuizSettings] = useState(false);
    const [quizSettings, setQuizSettings] = useState<QuizSettings>({includeMCQ: true, includeFRQ: false, quizStyle: "mixed", length: "normal"});
    const [selectedCards, setSelectedCards] = useState<boolean[]>(lesson.cardsToUnlock.map(() => true));
    const [lessonQuizzes, setLessonQuizzes] = useState<{id?: string, status: 'creating' | 'created', title?: string}[]>(lesson.quizIds?.map(id => ({id, status: 'created'})) || []);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState<boolean | string>(false);
    const [quizError, setQuizError] = useState<string | null>(null);

    useEffect(() => {
        if (lesson.quizIds && lesson.quizIds.length > 0) {
            Promise.all(lesson.quizIds.map(id => getQuiz(id))).then(quizzes => {
                setLessonQuizzes(quizzes.map((quiz, index) => ({
                    id: lesson.quizIds![index],
                    status: 'created' as const,
                    title: quiz?.title
                })));
            }).catch(error => {
                console.error('Error fetching quiz titles:', error);
            });
        } else {
            setLessonQuizzes([]);
        }
    }, [lesson.quizIds]);
    return (
        <div
            className={`mb-6 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] p-3`}>
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Collapse button */}
                    <button
                        onClick={() => onToggleCollapse(index)}
                        className="text-[var(--foreground)] hover:text-[var(--accent-500)] px-2 py-1 flex-shrink-0"
                    >
                        {collapsed ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
                    </button>

                    {/* Title + Description */}
                    <div className="flex items-center gap-2 w-full min-w-0 cursor-pointer" onClick={() => onToggleCollapse(index)}>
                        {/* Title stays on the left */}
                        <div className="text-lg font-medium text-[var(--foreground)] flex-shrink-0">
                            {index + 1}. {lesson.title || 'Untitled Lesson'}
                        </div>

                        {/* Description takes remaining space and truncates if needed */}
                        {lesson.description && (
                            <div className="text-sm text-[var(--foreground)] opacity-70 flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
                                {lesson.description}
                            </div>
                        )}
                    </div>
                </div>

                {/* Remove button */}
                <button
                    onClick={() => onRemove(index)}
                    className="text-red-500 hover:text-red-700 px-2 py-1 flex-shrink-0"
                >
                    Remove
                </button>
            </div>
            {!collapsed && (
                <div>
                    <div className="mb-3 mt-2">
                        <div
                            className="flex items-center justify-center border border-[var(--neutral-300)] rounded-lg p-3 cursor-pointer
                                    bg-[var(--neutral-100)]
                                    hover:bg-[var(--neutral-300)]
                                    transition-colors duration-200"
                            onClick={() => setIsFastCreatePopupOpen(true)}
                        >
                            <span className="text-[var(--accent-500)] font-semibold">+ Fast Create Lesson</span>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                            Lesson Title
                        </label>
                        <input
                            type="text"
                            value={lesson.title}
                            onChange={(e) => onUpdate(index, "title", e.target.value)}
                            className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                            placeholder="Enter lesson title"
                        />
                    </div>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                            Lesson Description
                        </label>
                        <textarea
                            value={lesson.description}
                            onChange={(e) => onUpdate(index, "description", e.target.value)}
                            className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-20"
                            placeholder="Enter lesson description"
                        />
                    </div>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                            Cards to Unlock
                        </label>
                        {lesson.cardsToUnlock.map((card, cardIndex) => (
                            <div key={`card-${index}-${cardIndex}`} className={`mb-4 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] p-3 ${!(collapsedCards[index] && collapsedCards[index][cardIndex]) ? 'min-h-[100px]' : ''}`}>
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {/* Collapse button */}
                                        <button
                                            onClick={() => onToggleCardCollapse(index, cardIndex)}
                                            className="text-[var(--foreground)] hover:text-[var(--accent-500)] px-2 py-1 flex-shrink-0"
                                        >
                                            {(collapsedCards[index] && collapsedCards[index][cardIndex]) 
                                                ? <FiChevronRight size={14} /> 
                                                : <FiChevronDown size={14} />}
                                        </button>

                                        {/* Title + first detail */}
                                        <div
                                            className="flex items-center gap-2 w-full min-w-0 cursor-pointer"
                                            onClick={() => onToggleCardCollapse(index, cardIndex)}
                                        >
                                            {/* Title stays on the left */}
                                            <div className="text-md font-medium text-[var(--foreground)] flex-shrink-0">
                                                {card.title || `Card ${cardIndex + 1}`}
                                            </div>

                                            {/* First detail takes remaining space and truncates */}
                                            {card.details && card.details[0] && (
                                                <div className="text-sm text-[var(--foreground)] opacity-70 flex-1 overflow-hidden whitespace-nowrap text-ellipsis ml-4">
                                                    {card.details[0]}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Remove button */}
                                    <button
                                        onClick={() => onRemoveCard(index, cardIndex)}
                                        className="text-red-500 hover:text-red-700 px-2 py-1 flex-shrink-0"
                                    >
                                        Remove Card
                                    </button>
                                </div>

                                {(!collapsedCards[index] || !collapsedCards[index][cardIndex]) && (
                                    <div>
                                        <div className="mb-2">
                                            <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                value={card.title}
                                                onChange={(e) => onUpdateCard(index, cardIndex, "title", e.target.value)}
                                                className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                                                placeholder="Enter card title"
                                            />
                                        </div>
                                        <div className="mb-2">
                                            <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                                                Details
                                            </label>
                                            {card.details?.map((detail, detailIndex) => (
                                                <div key={detailIndex} className="flex gap-2 items-start mb-1">
                                                    <textarea
                                                        value={detail}
                                                        onChange={(e) => onUpdateDetail(index, cardIndex, detailIndex, e.target.value)}
                                                        className="flex-1 p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] resize-y"
                                                        placeholder={"Detail " + (detailIndex + 1)}
                                                    />
                                                    {card.details && card.details.length > 1 && (
                                                        <button
                                                            onClick={() => onRemoveDetail(index, cardIndex, detailIndex)}
                                                            className="text-red-500 hover:text-red-700 mt-2"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {card.details && card.details.length < 6 && (
                                                <button
                                                    onClick={() => onAddDetail(index, cardIndex)}
                                                    className="text-[var(--accent-500)] hover:text-[var(--accent-600)] text-sm"
                                                >
                                                    + Add detail
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => onAddCard(index)}
                            className="text-[var(--accent-500)] hover:text-[var(--accent-600)] text-sm"
                        >
                            + Add Card
                         </button>
                     </div>

                     {/* Lesson Quizzes */}
                     <div className="mb-3">
                         <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                             Lesson Quizzes
                         </label>
                         {lessonQuizzes.map((quiz, quizIndex) => (
                             <div key={quizIndex} className="mb-4 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] p-3">
                                 <div className="flex justify-between items-center w-full">
                                     <div className="text-md font-medium text-[var(--foreground)] flex-shrink-0">
                                         {quiz.title || `Lesson Quiz ${quizIndex + 1}`}
                                     </div>
                                     {quiz.status === 'created' && quiz.id && (
                                         <Button color="var(--accent-400)" onClick={() => window.open(`/quiz/${quiz.id}`, '_blank')}>
                                             View Quiz
                                         </Button>
                                     )}
                                     {quiz.status === 'creating' && <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />}
                                 </div>
                             </div>
                         ))}
                         {lessonQuizzes.length === 0 && <p className="text-sm text-[var(--neutral-600)]">No quizzes created yet.</p>}
                     </div>

                     {/* Create Lesson Quiz */}
                     <div className="mb-4 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] p-3">
                         <div className="flex justify-between items-center w-full">
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                                 <button
                                     onClick={() => setShowQuizSettings(!showQuizSettings)}
                                     className="text-[var(--foreground)] hover:text-[var(--accent-500)] px-2 py-1 flex-shrink-0"
                                 >
                                     {showQuizSettings ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                                 </button>
                                 <div className="text-lg font-medium text-[var(--foreground)] flex-shrink-0">
                                     Create Lesson Quiz
                                 </div>
                             </div>
                         </div>
                         {showQuizSettings && (
                             <div className="mt-4 p-4 bg-[var(--neutral-100)]">
                                 <QuizSettingsComponent
                                     cards={lesson.cardsToUnlock}
                                     selectedCards={selectedCards}
                                     setSelectedCards={setSelectedCards}
                                     quizSettings={quizSettings}
                                     setQuizSettings={setQuizSettings}
                                     quizError={quizError}
                                     setQuizError={setQuizError}
                                     onCreate={async () => {
                                         if (lessonQuizzes.some(q => q.status === 'creating')) {
                                             setQuizError("A quiz is already being created for this lesson.");
                                             return;
                                         }
                                         if (!quizSettings.includeMCQ && !quizSettings.includeFRQ) {
                                             setQuizError("Please select at least one type of question to include in your quiz.");
                                             return;
                                         }
                                         const cardsToUse = lesson.cardsToUnlock.filter((_, i) => selectedCards[i]);
                                         if (cardsToUse.length < 3) {
                                             const proceed = window.confirm("It is recommended to have at least 3 cards for a quiz. Do you want to proceed?");
                                             if (!proceed) return;
                                         }
                                         setLessonQuizzes([...lessonQuizzes, {status: 'creating'}]);
                                         setShowQuizSettings(false);
                                         try {
                                             const quizId = await createQuiz(cardsToUse, quizSettings);
                                             const quiz = await getQuiz(quizId);
                                             setLessonQuizzes(prev => {
                                                 const updated = [...prev];
                                                 updated[updated.length - 1] = {id: quizId, status: 'created', title: quiz?.title};
                                                 return updated;
                                             });
                                             onAddQuizId(quizId);
                                         } catch (error) {
                                             console.error("Error creating quiz:", error);
                                             setQuizError("Failed to create quiz");
                                             setLessonQuizzes(prev => prev.slice(0, -1));
                                             setShowQuizSettings(true);
                                         }
                                     }}
                                     isCreating={isCreatingQuiz}
                                 />
                             </div>
                         )}
                     </div>
                 </div>
             )}

            {/* --- Fast Create Popup --- */}
            <FastCreatePopup
                isOpen={isFastCreatePopupOpen}
                onClose={() => setIsFastCreatePopupOpen(false)}
                title="Fast Create Lesson"
                placeholder="Paste the text content for this lesson"
                onGenerate={async (text) => {
                    setIsGeneratingLesson(true);
                    try {
                        await onGenerateLesson(text);
                    } catch (error) {
                        console.error('Error generating lesson:', error);
                    } finally {
                        setIsGeneratingLesson(false);
                        setIsFastCreatePopupOpen(false);
                    }
                }}
                isGenerating={isGeneratingLesson}
                mode="lesson"
            />
        </div>
    );
}
