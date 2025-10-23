"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Button from "../../button";
import Loading from "../../loading";
import FastCreatePopup from "./fast_create_popup";
import LessonComponent from "./edit_lesson";
import { CourseLesson, Card, NewCard, Course, NewCourse } from "@/lib/types";
import { createCourse, getCourse, updateCourse } from "@/app/views/courses";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

type CourseLessonForm = Omit<CourseLesson, "id" | "courseId" | "index" | "cardsToUnlock"> & { cardsToUnlock: NewCard[]; id?: string };

export default function CreateCourse() {
    const [courseTitle, setCourseTitle] = useState("");
    const [courseDescription, setCourseDescription] = useState("");
    const [lessons, setLessons] = useState<CourseLessonForm[]>([{ title: "", description: "", content: "", cardsToUnlock: [] }]);
    const [collapsedLessons, setCollapsedLessons] = useState<boolean[]>([true]);
    const [collapsedCards, setCollapsedCards] = useState<{ [lessonIndex: number]: boolean[] }>({});
    const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
    const [isCreatingCourse, setIsCreatingCourse] = useState(false);
    const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [isFastCreatePopupOpen, setIsFastCreatePopupOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editCourseId, setEditCourseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const searchParams = useSearchParams();

    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId) {
            setIsEdit(true);
            setEditCourseId(editId);
            setLoading(true);
            getCourse(editId).then((result) => {
                if (result) {
                    const { course } = result;
                    setCourseTitle(course.title);
                    setCourseDescription(course.description || "");
                    setIsPublic(course.public || false);
                    const loadedLessons: CourseLessonForm[] = course.lessons.map((lesson) => ({
                        id: lesson.id,
                        title: lesson.title,
                        description: lesson.description,
                        content: "",
                        cardsToUnlock: lesson.cardsToUnlock.map((card) => ({
                            title: card.title,
                            details: card.details || [],
                        })),
                    }));
                    setLessons(loadedLessons);
                    setCollapsedLessons(new Array(loadedLessons.length).fill(true));
                    const newCollapsedCards: { [key: number]: boolean[] } = {};
                    loadedLessons.forEach((lesson, i) => {
                        newCollapsedCards[i] = new Array(lesson.cardsToUnlock.length).fill(true);
                    });
                    setCollapsedCards(newCollapsedCards);
                }
                setLoading(false);
            });
        }
    }, [searchParams]);

    const addLesson = () => {
        setLessons([...lessons, { title: "", description: "", content: "", cardsToUnlock: [] }]);
        setCollapsedLessons([...collapsedLessons, true]);
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

    const updateLesson = (index: number, field: "title" | "description" | "content", value: string) => {
        const newLessons = [...lessons];
        newLessons[index][field] = value;
        setLessons(newLessons);
    };

    const addCard = (lessonIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock.push({
            title: "",
            details: [""],
        });
        setLessons(newLessons);
        // Add collapsed state for new card
        const newCollapsed = { ...collapsedCards };
        if (!newCollapsed[lessonIndex]) {
            newCollapsed[lessonIndex] = [];
        }
        newCollapsed[lessonIndex].push(true);
        setCollapsedCards(newCollapsed);
    };

    const removeCardFromLesson = (lessonIndex: number, cardIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock.splice(cardIndex, 1);
        setLessons(newLessons);
    };

    const updateCard = (lessonIndex: number, cardIndex: number, field: "title", value: string) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock[cardIndex][field] = value;
        setLessons(newLessons);
    };

    const addDetailToCard = (lessonIndex: number, cardIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock[cardIndex].details!.push("");
        setLessons(newLessons);
    };

    const removeDetailFromCard = (lessonIndex: number, cardIndex: number, detailIndex: number) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock[cardIndex].details!.splice(detailIndex, 1);
        setLessons(newLessons);
    };

    const updateCardDetail = (lessonIndex: number, cardIndex: number, detailIndex: number, value: string) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].cardsToUnlock[cardIndex].details![detailIndex] = value;
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





    const handleSubmit = async () => {
        setIsCreatingCourse(true);
        try {
            if (isEdit && editCourseId) {
                const courseData = {
                    title: courseTitle,
                    description: courseDescription,
                        lessons: lessons.map((lesson, index) => ({
                            id: lesson.id!,
                            courseId: editCourseId,
                            index,
                            title: lesson.title,
                            description: lesson.description,
                            content: lesson.content,
                            cardsToUnlock: lesson.cardsToUnlock as Card[],
                            quizIds: [],
                        })),
                    public: isPublic,
                    sharedWith: [],
                };
                const success = await updateCourse(editCourseId, courseData);
                if (success) {
                    window.location.href = `/courses/${editCourseId}`;
                }
            } else {
                const courseData: NewCourse = {
                    title: courseTitle,
                    description: courseDescription,
                    lessons: lessons.map((lesson, index) => ({
                        index,
                        title: lesson.title,
                        description: lesson.description,
                        content: lesson.content,
                        cardsToUnlock: lesson.cardsToUnlock,
                        quizIds: [],
                    })),
                    public: isPublic,
                    sharedWith: [],
                };
                const data = await createCourse(courseData);
                if (data) {
                    // Redirect to the course page
                    window.location.href = `/courses/${data.id}`;
                }
            }
        } catch (error) {
            console.error('Error submitting course:', error);
        } finally {
            setIsCreatingCourse(false);
        }
    };

    const isLoading = isGeneratingCourse || isCreatingCourse || isGeneratingLesson || loading;

    return (
        <div className="mt-8">

            {/* --- Fast Create Course Button --- */}
            <div className="mb-8">
                <div
                    className="flex items-center justify-center border border-[var(--neutral-300)] rounded-lg p-4 cursor-pointer
                            bg-[var(--neutral-100)]
                            hover:bg-[var(--neutral-300)]
                            transition-colors duration-200"
                    onClick={() => setIsFastCreatePopupOpen(true)}
                >
                    <span className="text-[var(--accent-500)] font-semibold text-lg">+ Fast Create Course</span>
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
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">{isEdit ? "Edit Course" : "Create Course"}</h3>
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
                         onGenerateLesson={async (text) => {
                             setIsGeneratingLesson(true);
                             try {
                                 const response = await fetch('/api/courses/create', {
                                     method: 'PATCH',
                                     headers: {
                                         'Content-Type': 'application/json',
                                         'Authorization': `Bearer ${await getIdToken(auth.currentUser!)}`,
                                     },
                                     body: JSON.stringify({ text }),
                                 });
                                 if (!response.ok) {
                                     throw new Error('Failed to generate lesson');
                                 }
                                 const data = await response.json();
                                 if (data) {
                                     updateLesson(index, 'title', data.title);
                                     updateLesson(index, 'description', data.description);
                                     // Update cards if available
                                     if (data.cardsToUnlock) {
                                         const newLessons = [...lessons];
                                         newLessons[index].cardsToUnlock = data.cardsToUnlock;
                                         setLessons(newLessons);
                                     }
                                 }
                             } catch (error) {
                                 console.error('Error generating lesson:', error);
                             } finally {
                                 setIsGeneratingLesson(false);
                             }
                         }}
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
            <div className="flex justify-center gap-4">
                {isLoading ? (
                    <Loading small={true} loadingText={isCreatingCourse ? "Creating Course" : isEdit ? "Loading Course" : "Processing"} />
                ) : (
                    <>
                        {isEdit && (
                            <Button color="var(--neutral-300)" onClick={() => window.location.href = '/courses'}>
                                Cancel
                            </Button>
                        )}
                        <Button color="var(--accent-500)" onClick={handleSubmit}>
                            {isEdit ? "Update Course" : "Create Course"}
                        </Button>
                    </>
                )}
            </div>

            {/* --- Fast Create Popup --- */}
            <FastCreatePopup
                isOpen={isFastCreatePopupOpen}
                onClose={() => setIsFastCreatePopupOpen(false)}
                title="Fast Create Course"
                placeholder="Paste the text content that will be processed into a course with lessons"
                onGenerate={async (text, onUpdate) => {
                    setIsGeneratingCourse(true);
                    try {
                        const response = await fetch('/api/courses/create', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${await getIdToken(auth.currentUser!)}`,
                            },
                            body: JSON.stringify({ text }),
                        });

                        if (!response.ok) {
                            throw new Error('Failed to generate course');
                        }

                        const reader = response.body?.getReader();
                        if (!reader) throw new Error('No response body');

                        const decoder = new TextDecoder();
                        let buffer = '';

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                if (line.trim()) {
                                    try {
                                        const update = JSON.parse(line.trim());
                                        if (update.type === 'status') {
                                            onUpdate(update.message);
                                        } else if (update.type === 'outline') {
                                            onUpdate(`Course outline created: ${update.courseStructure.courseTitle}`);
                                        } else if (update.type === 'lesson_start') {
                                            onUpdate(`Creating lesson ${update.lessonNumber}: ${update.lessonTitle}`);
                                        } else if (update.type === 'lesson_complete') {
                                            onUpdate(`Completed lesson ${update.lessonNumber}`);
                                         } else if (update.type === 'complete') {
                                             const data = update.course;
                                             setCourseTitle(data.title);
                                             setCourseDescription(data.description);
                                             const mappedLessons = data.lessons.map((lesson: { title: string; description: string; cardsToUnlock: NewCard[] }) => ({
                                                 title: lesson.title,
                                                 description: lesson.description,
                                                  content: '',
                                                 cardsToUnlock: lesson.cardsToUnlock,
                                             }));
                                             setLessons(mappedLessons);
                                             setCollapsedLessons(mappedLessons.map(() => true));
                                             const newCollapsedCards: { [lessonIndex: number]: boolean[] } = {};
                                              mappedLessons.forEach((lesson: CourseLessonForm, index: number) => {
                                                 newCollapsedCards[index] = lesson.cardsToUnlock.map(() => true);
                                             });
                                             setCollapsedCards(newCollapsedCards);
                                             onUpdate('Course generation complete!');
                                        } else if (update.type === 'error') {
                                            onUpdate(`Error: ${update.message}`);
                                        }
                                    } catch (e) {
                                        console.error('Failed to parse update:', line, e);
                                        onUpdate(`Parsing error: ${line.substring(0, 50)}...`);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error generating course:', error);
                        onUpdate('Error generating course');
                    } finally {
                        setIsGeneratingCourse(false);
                        setIsFastCreatePopupOpen(false);
                    }
                }}
                isGenerating={isGeneratingCourse}
            />
        </div>
    );
}
