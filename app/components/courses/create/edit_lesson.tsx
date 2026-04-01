"use client";

import { useState, useEffect } from "react";
import { FiLoader, FiExternalLink, FiTrash2, FiX, FiPlus } from "react-icons/fi";

import FastCreatePopup from "./fast_create_popup";
import QuizSettingsComponent from "./quiz_settings";
import { NewCourseUnlockCard, CourseResource, CourseLesson } from "@/lib/types/course";
import { QuizSettings } from "@/lib/types/quiz";
import { createQuiz, getQuiz } from "@/app/views/quiz";
import TutorConfigEditor from "./tutor_config_editor";
import ResourceEditor from "./resource_editor";
import BaseProjectEditor from "./base_project_editor";

type LessonForm = Omit<CourseLesson, "id" | "courseId" | "index" | "cardsToUnlock"> & { cardsToUnlock: NewCourseUnlockCard[] };

interface LessonComponentProps {
    lesson: LessonForm;
    index: number;
    onUpdate: (index: number, field: "title" | "description" | "content", value: string) => void;
    onSetLesson: (index: number, lesson: LessonForm) => void;
    onAddCard: (lessonIndex: number) => void;
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
    onUpdate,
    onSetLesson,
    onAddCard,
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
    const [activeTab, setActiveTab] = useState<"overview" | "tutor" | "resources" | "template" | "unlocks" | "quiz">("overview");
    const [quizSettings, setQuizSettings] = useState<QuizSettings>({includeMCQ: true, includeFRQ: false, quizStyle: "mixed", length: "normal"});
    const [selectedCards, setSelectedCards] = useState<boolean[]>(lesson.cardsToUnlock.map(() => true));
    const [lessonQuizzes, setLessonQuizzes] = useState<{id?: string, status: 'creating' | 'created', title?: string}[]>(lesson.quizIds?.map(id => ({id, status: 'created'})) || []);
    const [quizError, setQuizError] = useState<string | null>(null);

    const lessonResources = lesson.resources || [];
    const studentResources = lessonResources.filter(r => r.studentVisible !== false);
    const referenceResources = lessonResources.filter(r => r.includeInTutorReference === true);

    const handleReferenceResourcesChange = (nextRefs: CourseResource[]) => {
        const otherResources = lessonResources.filter(r => r.includeInTutorReference !== true);
        onSetLesson(index, { ...lesson, resources: [...otherResources, ...nextRefs] });
    };

    const handleStudentResourcesChange = (nextStudent: CourseResource[]) => {
        const otherResources = lessonResources.filter(r => r.studentVisible === false);
        onSetLesson(index, { ...lesson, resources: [...otherResources, ...nextStudent] });
    };

    useEffect(() => {
        if (lesson.quizIds && lesson.quizIds.length > 0) {
            Promise.all(lesson.quizIds.map(id => getQuiz(id))).then(quizzes => {
                setLessonQuizzes(quizzes.map((quiz, qIdx) => ({
                    id: lesson.quizIds![qIdx],
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

    const tabItems = [
        { id: "overview", label: "Overview" },
        { id: "tutor", label: "Tutor" },
        { id: "resources", label: "Resources" },
        { id: "template", label: "Template" },
        { id: "unlocks", label: "Unlocks" },
        { id: "quiz", label: "Quiz" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex border-b border-[var(--neutral-300)] mb-6 overflow-x-auto scrollbar-hide">
                {tabItems.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                            activeTab === tab.id 
                            ? "text-[var(--accent-500)]" 
                            : "text-[var(--neutral-500)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-500)]" />
                        )}
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in duration-300">
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-[var(--neutral-700)] mb-2 uppercase tracking-tight text-[10px]">Lesson Title</label>
                            <input
                                type="text"
                                value={lesson.title}
                                onChange={(e) => onUpdate(index, "title", e.target.value)}
                                className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] font-semibold"
                                placeholder="Enter lesson title"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[var(--neutral-700)] mb-2 uppercase tracking-tight text-[10px]">Short Description</label>
                            <textarea
                                value={lesson.description}
                                onChange={(e) => onUpdate(index, "description", e.target.value)}
                                className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-20 resize-none"
                                placeholder="A brief summary for the course page"
                            />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={lesson.optional === true}
                                onChange={(e) => onSetLesson(index, { ...lesson, optional: e.target.checked })}
                                className="w-4 h-4 rounded border-[var(--neutral-300)]"
                            />
                            <span className="text-sm font-medium text-[var(--foreground)]">Optional lesson (not required for portfolio report completion)</span>
                        </label>
                        <div>
                            <label className="block text-sm font-bold text-[var(--neutral-700)] mb-2 uppercase tracking-tight text-[10px]">Prep Guide (Markdown)</label>
                            <textarea
                                value={lesson.guide?.body || lesson.content || ""}
                                onChange={(e) => onSetLesson(index, {
                                    ...lesson,
                                    content: e.target.value,
                                    guide: e.target.value.trim() ? { body: e.target.value } : undefined,
                                })}
                                className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-48 font-mono text-sm"
                                placeholder="Instructions for students before they start the project."
                            />
                        </div>
                        
                        <div className="pt-4">
                            <button
                                onClick={() => setIsFastCreatePopupOpen(true)}
                                className="w-full py-4 border-2 border-dashed border-[var(--neutral-300)] rounded-lg text-[var(--neutral-500)] font-bold hover:bg-[var(--neutral-100)] hover:text-[var(--accent-500)] hover:border-[var(--accent-300)] transition-all flex items-center justify-center gap-2"
                            >
                                <FiLoader /> FAST GENERATE CONTENT
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "tutor" && (
                    <TutorConfigEditor
                        label="Lesson Tutor grounding"
                        helperText="Provide specific knowledge for this lesson."
                        value={lesson.tutorConfig}
                        onChange={(tutorConfig) => onSetLesson(index, { ...lesson, tutorConfig })}
                        referenceResources={referenceResources}
                        onReferenceResourcesChange={handleReferenceResourcesChange}
                    />
                )}

                {activeTab === "resources" && (
                    <ResourceEditor
                        label="Lesson Student Materials"
                        helperText="Files or links visible to students."
                        resources={studentResources}
                        onChange={handleStudentResourcesChange}
                        defaultStudentVisible={true}
                        defaultIncludeInTutorReference={false}
                    />
                )}

                {activeTab === "template" && (
                    <BaseProjectEditor
                        value={lesson.baseProjectTemplate}
                        onChange={(baseProjectTemplate) => onSetLesson(index, { ...lesson, baseProjectTemplate })}
                    />
                )}

                {activeTab === "unlocks" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-[var(--neutral-700)] uppercase tracking-tight text-[10px]">Required Notecards</label>
                            <button
                                onClick={() => onAddCard(index)}
                                className="text-[var(--accent-500)] hover:text-[var(--accent-600)] text-xs font-bold flex items-center gap-1"
                            >
                                <FiPlus /> ADD CARD
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {lesson.cardsToUnlock.map((card, cardIndex) => (
                                <div key={`card-${index}-${cardIndex}`} className="bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded-lg p-4 shadow-sm group">
                                    <div className="flex justify-between items-start mb-4">
                                        <input
                                            type="text"
                                            value={card.title}
                                            onChange={(e) => onUpdateCard(index, cardIndex, "title", e.target.value)}
                                            className="bg-transparent border-b border-[var(--neutral-300)] focus:border-[var(--accent-500)] font-bold text-[var(--foreground)] focus:outline-none flex-1 mr-4"
                                            placeholder="Card Title"
                                        />
                                        <button
                                            onClick={() => onRemoveCard(index, cardIndex)}
                                            className="text-[var(--neutral-400)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {card.details?.map((detail, detailIndex) => (
                                            <div key={detailIndex} className="flex gap-2 items-start group/detail">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-500)] mt-3 flex-shrink-0" />
                                                <textarea
                                                    value={detail}
                                                    onChange={(e) => onUpdateDetail(index, cardIndex, detailIndex, e.target.value)}
                                                    className="flex-1 p-2 text-sm bg-transparent border-none focus:ring-0 focus:outline-none resize-none min-h-[40px]"
                                                    placeholder="Point detail..."
                                                />
                                                {card.details && card.details.length > 1 && (
                                                    <button
                                                        onClick={() => onRemoveDetail(index, cardIndex, detailIndex)}
                                                        className="text-[var(--neutral-400)] hover:text-red-500 opacity-0 group-hover/detail:opacity-100 mt-2"
                                                    >
                                                        <FiX size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => onAddDetail(index, cardIndex)}
                                            className="text-[var(--accent-500)] hover:underline text-[10px] font-bold ml-3.5"
                                        >
                                            + ADD POINT
                                        </button>
                                    </div>

                                    <div className="pt-4 border-t border-[var(--neutral-200)]">
                                        <label className="block text-[9px] font-bold text-[var(--neutral-500)] uppercase mb-2">Tutor Guidance</label>
                                        <textarea
                                            value={card.unlockInstruction || ""}
                                            onChange={(e) => {
                                                const nextCards = [...lesson.cardsToUnlock];
                                                nextCards[cardIndex] = { ...card, unlockInstruction: e.target.value };
                                                onSetLesson(index, { ...lesson, cardsToUnlock: nextCards });
                                            }}
                                            className="w-full p-2 bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded text-[11px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-500)] h-12 resize-none"
                                            placeholder="What evidence unlocks this card?"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "quiz" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[var(--neutral-700)] uppercase tracking-tight text-[10px]">Lesson Quizzes</h3>
                            <button
                                onClick={() => setShowQuizSettings(!showQuizSettings)}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
                                    showQuizSettings 
                                    ? "bg-[var(--neutral-300)] text-[var(--foreground)]" 
                                    : "bg-[var(--accent-500)] text-white"
                                }`}
                            >
                                {showQuizSettings ? "CANCEL" : "+ GENERATE"}
                            </button>
                        </div>

                        {showQuizSettings && (
                            <div className="bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded-lg p-6 animate-in slide-in-from-top-2 shadow-sm">
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
                                        const cardsToUse = lesson.cardsToUnlock.filter((_, i) => selectedCards[i]);
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
                                    isCreating={false}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            {lessonQuizzes.map((quiz, quizIdx) => (
                                <div key={quizIdx} className="flex justify-between items-center p-3 bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded-lg group">
                                    <div className="text-sm font-bold text-[var(--foreground)]">
                                        {quiz.title || `Lesson Quiz ${quizIdx + 1}`}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {quiz.status === 'created' && quiz.id && (
                                            <>
                                                <button 
                                                    onClick={() => window.open(`/quiz/${quiz.id}`, '_blank')}
                                                    className="p-1.5 text-[var(--neutral-500)] hover:text-[var(--foreground)]"
                                                >
                                                    <FiExternalLink size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const nextIds = lesson.quizIds?.filter(id => id !== quiz.id) || [];
                                                        onSetLesson(index, { ...lesson, quizIds: nextIds });
                                                    }}
                                                    className="p-1.5 text-red-400 hover:text-red-600"
                                                >
                                                    <FiX size={14} />
                                                </button>
                                            </>
                                        )}
                                        {quiz.status === 'creating' && <FiLoader className="animate-spin text-[var(--neutral-400)] size-3" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Fast Create Popup */}
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
