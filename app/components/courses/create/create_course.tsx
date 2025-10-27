"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FiChevronDown, FiChevronRight, FiLoader } from "react-icons/fi";
import Button from "../../button";
import Loading from "../../loading";
import FastCreatePopup from "./fast_create_popup";
import QuizSettingsComponent from "./quiz_settings";
import LessonComponent from "./edit_lesson";
import { Card, NewCard, NewCourse, QuizSettings, CourseCategory, NewLesson } from "@/lib/types";
import { createCourse, getCourse, updateCourse, streamGenerateCourse } from "@/app/views/courses";
import { createQuiz, getQuiz } from "@/app/views/quiz";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

type CourseLessonForm = Omit<NewLesson, "index"> & { id?: string; };

export default function CreateCourse() {
    const [courseTitle, setCourseTitle] = useState("");
    const [courseDescription, setCourseDescription] = useState("");
    const [lessons, setLessons] = useState<CourseLessonForm[]>([{ title: "", description: "", content: "", cardsToUnlock: [], quizIds: [] }]);
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
    const [courseQuizIds, setCourseQuizIds] = useState<string[]>([]);
    const [courseQuizzes, setCourseQuizzes] = useState<{id?: string, status: 'creating' | 'created', title?: string}[]>([]);
    const [showCourseQuizSettings, setShowCourseQuizSettings] = useState(false);
    const [courseQuizSettings, setCourseQuizSettings] = useState<QuizSettings>({includeMCQ: true, includeFRQ: false});
    const [selectedCards, setSelectedCards] = useState<boolean[]>([]);
    const [courseQuizError, setCourseQuizError] = useState<string | null>(null);
    const [courseCategory, setCourseCategory] = useState<CourseCategory | "">("");

    const searchParams = useSearchParams();

    useEffect(() => {
        const totalCards = lessons.reduce((sum, l) => sum + l.cardsToUnlock.length, 0);
        setSelectedCards(new Array(totalCards).fill(true));
    }, [lessons]);

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
                    setCourseCategory(course.category || "");
                    const loadedLessons: CourseLessonForm[] = course.lessons.map((lesson) => ({
                        id: lesson.id,
                        title: lesson.title,
                        description: lesson.description,
                        content: "",
                        cardsToUnlock: lesson.cardsToUnlock.map((card) => ({
                            title: card.title,
                            details: card.details || [],
                        })),
                        quizIds: lesson.quizIds || [],
                    }));
                    setLessons(loadedLessons);
                    setCollapsedLessons(new Array(loadedLessons.length).fill(true));
                    const newCollapsedCards: { [key: number]: boolean[] } = {};
                    loadedLessons.forEach((lesson, i) => {
                        newCollapsedCards[i] = new Array(lesson.cardsToUnlock.length).fill(true);
                    });
                    setCollapsedCards(newCollapsedCards);
                     setCourseQuizIds(course.quizIds || []);
                     // Fetch titles for existing quizzes
                     if (course.quizIds && course.quizIds.length > 0) {
                         Promise.all(course.quizIds.map(id => getQuiz(id))).then(quizzes => {
                             setCourseQuizzes(quizzes.map((quiz, index) => ({
                                 id: course.quizIds![index],
                                 status: 'created' as const,
                                 title: quiz?.title
                             })));
                         }).catch(error => {
                             console.error('Error fetching quiz titles:', error);
                             // Fallback to default titles
                             setCourseQuizzes(course.quizIds!.map((id, index) => ({
                                 id,
                                 status: 'created' as const,
                                 title: `Course Quiz ${index + 1}`
                             })));
                         });
                     } else {
                         setCourseQuizzes([]);
                     }
                }
                setLoading(false);
            });
        }
    }, [searchParams]);

    const addLesson = () => {
        setLessons([...lessons, { title: "", description: "", content: "", cardsToUnlock: [], quizIds: [] }]);
        setCollapsedLessons([...collapsedLessons, true]);
    };

    const addQuizIdToLesson = (lessonIndex: number, quizId: string) => {
        const newLessons = [...lessons];
        newLessons[lessonIndex].quizIds!.push(quizId);
        setLessons(newLessons);
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
                            quizIds: lesson.quizIds || [],
                        })),
                    quizIds: courseQuizIds,
                    public: isPublic,
                    category: courseCategory === "" ? undefined : courseCategory,
                    sharedWith: [],
                };
                const success = await updateCourse(editCourseId, courseData);
                if (success) {
                    window.location.href = `/courses/${editCourseId}`;
                }
            } else {
                const courseData: NewCourse & { quizIds?: string[] } = {
                    title: courseTitle,
                    description: courseDescription,
                    lessons: lessons.map((lesson, index) => ({
                        index,
                        title: lesson.title,
                        description: lesson.description,
                        content: lesson.content,
                        cardsToUnlock: lesson.cardsToUnlock,
                        quizIds: lesson.quizIds || [],
                    })),
                    quizIds: courseQuizIds,
                    public: isPublic,
                    category: courseCategory === "" ? undefined : courseCategory,
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

    if (loading) {
        return <Loading small={true} loadingText="Loading Course" />;
    }

    return (
        <div className="mt-8">

            {/* --- Fast Create Course Button --- */}
            {!isEdit && (
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
            )}

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
                        onAddQuizId={(quizId) => addQuizIdToLesson(index, quizId)}
                         onGenerateLesson={async (text) => {
                               setIsGeneratingLesson(true);
                               try {
                                   const response = await fetch('/api/courses/create', {
                                       method: 'PATCH',
                                       headers: {
                                           'Content-Type': 'application/json',
                                           'Authorization': `Bearer ${await getIdToken(auth.currentUser!)}`,
                                       },
                                       body: JSON.stringify({ text, quizSettings: courseQuizSettings }),
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
                                       // Update quizIds if available
                                       if (data.quizIds && data.quizIds.length > 0) {
                                           addQuizIdToLesson(index, data.quizIds[0]);
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

                {/* Course Quiz Creation */}
                <div className="mb-8 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] p-3">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                                onClick={() => setShowCourseQuizSettings(!showCourseQuizSettings)}
                                className="text-[var(--foreground)] hover:text-[var(--accent-500)] px-2 py-1 flex-shrink-0"
                            >
                                {showCourseQuizSettings ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                            </button>
                            <div className="text-lg font-medium text-[var(--foreground)] flex-shrink-0">
                                Create Course Quiz
                            </div>
                        </div>
                    </div>
                    {showCourseQuizSettings && (
                        <div className="mt-4 p-4 bg-[var(--neutral-100)]">
                            <QuizSettingsComponent
                                cards={lessons.flatMap(l => l.cardsToUnlock)}
                                selectedCards={selectedCards}
                                setSelectedCards={setSelectedCards}
                                quizSettings={courseQuizSettings}
                                setQuizSettings={setCourseQuizSettings}
                                quizError={courseQuizError}
                                setQuizError={setCourseQuizError}
                                onCreate={async () => {
                                    if (courseQuizzes.some(q => q.status === 'creating')) {
                                        setCourseQuizError("A quiz is already being created for this course.");
                                        return;
                                    }
                                    if (!courseQuizSettings.includeMCQ && !courseQuizSettings.includeFRQ) {
                                        setCourseQuizError("Please select at least one type of question to include in your quiz.");
                                        return;
                                    }
                                    const cardsToUse = lessons.flatMap((lesson, lessonIndex) =>
                                        lesson.cardsToUnlock.map((card, cardIndex) => {
                                            const globalIndex = lessons.slice(0, lessonIndex).reduce((sum, l) => sum + l.cardsToUnlock.length, 0) + cardIndex;
                                            return selectedCards[globalIndex] ? card : null;
                                        }).filter((c): c is NewCard => c !== null)
                                    );
                                    if (cardsToUse.length < 3) {
                                        const proceed = window.confirm("It is recommended to have at least 3 cards for a quiz. Do you want to proceed?");
                                        if (!proceed) return;
                                    }
                                    // Add placeholder quiz
                                    const newQuiz = { status: 'creating' as const };
                                    setCourseQuizzes([...courseQuizzes, newQuiz]);
                                    setShowCourseQuizSettings(false);
                                    try {
                                        const quizId = await createQuiz(cardsToUse, courseQuizSettings);
                                        const quiz = await getQuiz(quizId);
                                        // Update the last quiz
                                        setCourseQuizzes(prev => {
                                            const updated = [...prev];
                                            updated[updated.length - 1] = { id: quizId, status: 'created' as const, title: quiz?.title };
                                            return updated;
                                        });
                                        setCourseQuizIds([...courseQuizIds, quizId]);
                                    } catch (error) {
                                        console.error("Error creating course quiz:", error);
                                        setCourseQuizError("Failed to create quiz");
                                        // Remove the failed quiz
                                        setCourseQuizzes(prev => prev.slice(0, -1));
                                        setShowCourseQuizSettings(true);
                                    }
                                }}
                                isCreating={false}
                            />
                        </div>
                    )}
                </div>

                {/* Course Quizzes List */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Course Quizzes</h3>
                    {courseQuizzes.map((quiz, index) => (
                        <div key={index} className="mb-6 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] p-3">
                            <div className="flex justify-between items-center w-full">
                                <div className="text-lg font-medium text-[var(--foreground)] flex-shrink-0">
                                    {quiz.title || `Course Quiz ${index + 1}`}
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
                    {courseQuizzes.length === 0 && <p className="text-sm text-[var(--neutral-600)]">No course quizzes created yet.</p>}
                </div>
            </div>

            {/* --- Course Settings --- */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Course Settings</h3>
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                        <button
                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${isPublic ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                            onClick={() => setIsPublic(!isPublic)}
                        >
                            Make course public
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                            Category
                        </label>
                        <select
                            value={courseCategory}
                            onChange={(e) => setCourseCategory(e.target.value as CourseCategory)}
                            className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                        >
                            <option value="">Select a category</option>
                            <option value="math">Math</option>
                            <option value="science">Science</option>
                            <option value="history">History</option>
                            <option value="health">Health</option>
                            <option value="business">Business</option>
                            <option value="life skills">Life Skills</option>
                            <option value="social studies">Social Studies</option>
                            <option value="computer science">Computer Science</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* --- Create Course --- */}
            <div className="flex justify-center gap-4">
                {isLoading ? (
                    <Loading small={true} loadingText={isCreatingCourse ? (isEdit ? "Updating Course" : "Creating Course") : isEdit ? "Loading Course" : "Processing"} />
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
                 onGenerate={async (text, options, onUpdate) => {
                     // options now includes finalQuizSettings and lessonQuizSettings
                     setIsGeneratingCourse(true);
                     try {
                         await streamGenerateCourse(
                             text,
                             onUpdate,
                             setCourseTitle,
                             setCourseDescription,
                             setLessons,
                             setCollapsedLessons,
                             setCollapsedCards,
                             setCourseQuizIds,
                             setCourseQuizzes,
                             options?.generateFinalQuiz ? options.finalQuizSettings : undefined,
                             options?.generateLessonQuizzes ? options.lessonQuizSettings : undefined
                         );
                     } catch (error) {
                         console.error('Error generating course:', error);
                         onUpdate('Error generating course');
                     } finally {
                         setIsGeneratingCourse(false);
                     }
                 }}
                isGenerating={isGeneratingCourse}
                mode="course"
            />
        </div>
    );
}
