"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import Button from "../../button";
import FastCreatePopup from "./fast_create_popup";
import { CourseLesson, Card, NewCard } from "@/lib/types";

type Lesson = Omit<CourseLesson, "id" | "courseId" | "index"> & { text: string; cardsToUnlock: NewCard[] };

interface LessonComponentProps {
    lesson: Lesson;
    index: number;
    collapsed: boolean;
    collapsedCards: { [lessonIndex: number]: boolean[] };
    onToggleCollapse: (index: number) => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, field: "title" | "description" | "text", value: string) => void;
    onAddCard: (lessonIndex: number) => void;
    onToggleCardCollapse: (lessonIndex: number, cardIndex: number) => void;
    onRemoveCard: (lessonIndex: number, cardIndex: number) => void;
    onUpdateCard: (lessonIndex: number, cardIndex: number, field: "title", value: string) => void;
    onAddDetail: (lessonIndex: number, cardIndex: number) => void;
    onRemoveDetail: (lessonIndex: number, cardIndex: number, detailIndex: number) => void;
    onUpdateDetail: (lessonIndex: number, cardIndex: number, detailIndex: number, value: string) => void;
    onGenerateLesson: (text: string) => Promise<void>;
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
}: LessonComponentProps) {
    const [isFastCreatePopupOpen, setIsFastCreatePopupOpen] = useState(false);
    const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
    return (
        <div
            className="mb-6 p-4 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] min-h-[200px]"
        >
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onToggleCollapse(index)}
                        className="text-[var(--foreground)] hover:text-[var(--accent-500)] px-2 py-1"
                    >
                        {collapsed ? (
                            <FiChevronDown size={16} />
                        ) : (
                            <FiChevronUp size={16} />
                        )}
                    </button>
                    <div className="cursor-pointer" onClick={() => onToggleCollapse(index)}>
                        <div className="text-lg font-medium text-[var(--foreground)] px-2 py-1 line-clamp-2">
                            {lesson.title || `Lesson ${index + 1}`}
                        </div>
                        {collapsed && lesson.description && (
                            <p className="text-sm text-[var(--foreground)] opacity-70 ml-8">
                                {lesson.description.length > 100 ? lesson.description.substring(0, 100) + "..." : lesson.description}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onRemove(index)}
                    className="text-red-500 hover:text-red-700 px-2 py-1"
                >
                    Remove
                </button>
            </div>
            {!collapsed && (
                <div>
                    <div className="mb-3">
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
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                            Cards to Unlock
                        </label>
                                    {lesson.cardsToUnlock.map((card, cardIndex) => (
                            <div key={`card-${index}-${cardIndex}`} className="mb-4 p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] min-h-[100px]">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onToggleCardCollapse(index, cardIndex)}
                                            className="text-[var(--foreground)] hover:text-[var(--accent-500)] px-2 py-1"
                                        >
                                            {(collapsedCards[index] && collapsedCards[index][cardIndex]) ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
                                        </button>
                                        <div className="cursor-pointer" onClick={() => onToggleCardCollapse(index, cardIndex)}>
                                            <div className="text-md font-medium text-[var(--foreground)] px-2 py-1 line-clamp-2">
                                                {card.title || `Card ${cardIndex + 1}`}
                                            </div>
                                            {collapsedCards[index] && collapsedCards[index][cardIndex] && card.details && card.details[0] && (
                                                <p className="text-sm text-[var(--foreground)] opacity-70 ml-6">
                                                    {card.details[0].length > 50 ? card.details[0].substring(0, 50) + "..." : card.details[0]}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onRemoveCard(index, cardIndex)}
                                        className="text-red-500 hover:text-red-700 px-2 py-1"
                                    >
                                        Remove Card
                                    </button>
                                </div>
                                {!(collapsedCards[index] && collapsedCards[index][cardIndex]) && (
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
            />
        </div>
    );
}