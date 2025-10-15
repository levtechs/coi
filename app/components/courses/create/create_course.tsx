"use client";

import { useState } from "react";
import Button from "../../button";
import Loading from "../../loading";
import LessonComponent from "./edit_lesson";
import { CourseLesson, Card } from "@/lib/types";
import { createCourse, generateCourseFromText, generateLessonFromText } from "@/app/views/courses";

type Lesson = Omit<CourseLesson, "id" | "courseId" | "index"> & { text: string; cards: Card[] };

export default function CreateCourse() {
    const [courseTitle, setCourseTitle] = useState("");
    const [courseDescription, setCourseDescription] = useState("");
    const [pastedText, setPastedText] = useState("");
    const [lessons, setLessons] = useState<Lesson[]>([{ title: "", description: "", text: "", cards: [] }]);
    const [collapsedLessons, setCollapsedLessons] = useState<boolean[]>([false]);
    const [collapsedCards, setCollapsedCards] = useState<{ [lessonIndex: number]: boolean[] }>({});
    const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
    const [isCreatingCourse, setIsCreatingCourse] = useState(false);
    const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
    const [isPublic, setIsPublic] = useState(false);

    const addLesson = () => {
        setLessons([...lessons, { title: "", description: "", text: "", cards: [] }]);
        setCollapsedLessons([...collapsedLessons, false]);
    };

    const removeLesson = (index: number) => {
        setLessons(lessons.filter((_, i) => i !== index));
        setCollapsedLessons(collapsedLessons.filter((_, i) => i !== index));
        // Also remove collapsed cards for this lesson
        const newCollapsedCards = { ...collapsedCards };
        delete newCollapsedCards[index];
        // Shift indices for higher lessons
        const shifted: { [key: number]: boolean[] } = {};
        Object.keys(newCollapsedCards).forEach(key => {
            const k = parseInt(key);
            if (k > index) {
                shifted[k - 1] = newCollapsedCards[k];
            } else if (k < index) {
                shifted[k] = newCollapsedCards[k];
            }
        });
        setCollapsedCards(shifted);
    };

    const updateLesson = (index: number, field: keyof Lesson, value: string) => {
        const newLessons = [...lessons];
        newLessons[index][field] = value;
        setLessons(newLessons);
    };

    const addCard = (lessonIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cards.push({
            id: `card-${Date.now()}`,
            title: "",
            details: [""],
        } as Card);
        setLessons(newLessons);
        // Add collapsed state for new card
        const newCollapsed = { ...collapsedCards };
        if (!newCollapsed[lessonIndex]) {
            newCollapsed[lessonIndex] = [];
        }
        newCollapsed[lessonIndex].push(false);
        setCollapsedCards(newCollapsed);
    };

    const removeCardFromLesson = (lessonIndex: number, cardIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cards.splice(cardIndex, 1);
        setLessons(newLessons);
    };

    const updateCard = (lessonIndex: number, cardIndex: number, field: "title", value: string) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cards[cardIndex][field] = value;
        setLessons(newLessons);
    };

    const addDetailToCard = (lessonIndex: number, cardIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cards[cardIndex].details!.push("");
        setLessons(newLessons);
    };

    const removeDetailFromCard = (lessonIndex: number, cardIndex: number, detailIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cards[cardIndex].details!.splice(detailIndex, 1);
        setLessons(newLessons);
    };

    const updateCardDetail = (lessonIndex: number, cardIndex: number, detailIndex: number, value: string) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cards[cardIndex].details![detailIndex] = value;
        setLessons(newLessons);
    };

    const toggleLessonCollapse = (index: number) => {
        const newCollapsed = [...collapsedLessons];
        newCollapsed[index] = !newCollapsed[index];
        setCollapsedLessons(newCollapsed);
    };

    const toggleCardCollapse = (lessonIndex: number, cardIndex: number) => {
        const newCollapsed = { ...collapsedCards };
        if (!newCollapsed[lessonIndex]) {
            newCollapsed[lessonIndex] = [];
        }
        newCollapsed[lessonIndex][cardIndex] = !newCollapsed[lessonIndex][cardIndex];
        setCollapsedCards(newCollapsed);
    };

    const handleGenerateCourseFromText = async () => {
        setIsGeneratingCourse(true);
        try {
            const data = await generateCourseFromText(pastedText);
            if (data) {
                setCourseTitle(data.title);
                setCourseDescription(data.description);
                // Map the lessons
                const mappedLessons = data.lessons.map((lesson) => ({
                    title: lesson.title,
                    description: lesson.description,
                    text: '', // no text in API
                    cards: lesson.cardsToUnlock,
                }));
                setLessons(mappedLessons);
                setCollapsedLessons(mappedLessons.map(() => false));
                setCollapsedCards({});
            }
        } catch (error) {
            console.error('Error generating course:', error);
        } finally {
            setIsGeneratingCourse(false);
        }
    };

    const handleGenerateLessonFromText = async (lessonIndex: number) => {
        setIsGeneratingLesson(true);
        try {
            const data = await generateLessonFromText(lessons[lessonIndex].text);
            if (data) {
                updateLesson(lessonIndex, 'title', data.title);
                updateLesson(lessonIndex, 'description', data.description);
                // Update cards if available
                if (data.cardsToUnlock) {
                    const newLessons = [...lessons];
                    newLessons[lessonIndex].cards = data.cardsToUnlock;
                    setLessons(newLessons);
                }
            }
        } catch (error) {
            console.error('Error generating lesson:', error);
        } finally {
            setIsGeneratingLesson(false);
        }
    };

    const handleCreateCourse = async () => {
        setIsCreatingCourse(true);
        try {
            const courseData = {
                title: courseTitle,
                description: courseDescription,
                lessons: lessons.map((lesson, index) => ({
                    index,
                    title: lesson.title,
                    description: lesson.description,
                    cardsToUnlock: lesson.cards,
                    quizIds: [],
                })),
                public: isPublic,
            };
            const data = await createCourse(courseData);
            if (data) {
                // Redirect to the course page
                window.location.href = `/courses/${data.id}`;
            }
        } catch (error) {
            console.error('Error creating course:', error);
        } finally {
            setIsCreatingCourse(false);
        }
    };

    const isLoading = isGeneratingCourse || isCreatingCourse || isGeneratingLesson;

    return (
        <div className="mt-8">
            {isLoading && <Loading small={true} loadingText="Processing" />}
            {/* --- Fast Create Course --- */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Fast Create Course</h3>
                <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-48"
                    placeholder="Paste the text content that will be processed into a course with lessons"
                />
                <div className="mt-4">
                    <Button color="var(--accent-500)" onClick={handleGenerateCourseFromText} disabled={isGeneratingCourse}>
                        Generate Course from Text
                    </Button>
                </div>
            </div>

            {/* --- Course Title --- */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Course Title
                </label>
                <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                    placeholder="Enter course title"
                />
            </div>

            {/* --- Course Description --- */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Course Description
                </label>
                <textarea
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-24"
                    placeholder="Enter course description"
                />
            </div>

            {/* --- Lessons --- */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Lessons</h3>
                {lessons.map((lesson, index) => (
                    <LessonComponent
                        key={index}
                        lesson={lesson}
                        index={index}
                        collapsed={collapsedLessons[index]}
                        collapsedCards={collapsedCards}
                        onToggleCollapse={toggleLessonCollapse}
                        onRemove={removeLesson}
                        onUpdate={updateLesson}
                        onAddCard={addCard}
                        onToggleCardCollapse={toggleCardCollapse}
                        onRemoveCard={removeCardFromLesson}
                        onUpdateCard={updateCard}
                        onAddDetail={addDetailToCard}
                        onRemoveDetail={removeDetailFromCard}
                        onUpdateDetail={updateCardDetail}
                        onGenerateLesson={() => handleGenerateLessonFromText(index)}
                    />
                ))}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={addLesson}
                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] text-sm"
                    >
                        + Add Lesson
                    </button>
                </div>
            </div>

            {/* --- Course Settings --- */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Course Settings</h3>
                <div className="flex gap-2">
                    <button
                        className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${isPublic ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                        onClick={() => setIsPublic(!isPublic)}
                    >
                        Make course public
                    </button>
                </div>
            </div>

            {/* --- Create Course --- */}
            <div className="flex justify-center">
                {isCreatingCourse ? (
                    <Loading small={true} loadingText="Creating Course" />
                ) : (
                    <Button color="var(--accent-500)" onClick={handleCreateCourse}>
                        Create Course
                    </Button>
                )}
            </div>
        </div>
    );
}
