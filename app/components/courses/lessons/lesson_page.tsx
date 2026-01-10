"use client";

import { useState, useEffect } from "react";
import { CourseLesson, Project, Card, Quiz } from "@/lib/types";
import { takeLesson } from "@/app/views/lessons";
import { getQuiz } from "@/app/views/quiz";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
import Button from "../../button";
import ProjectCard from "../../dashboard/project_card";
import Modal from "../../modal";
import DetailCard from "../../editor/cards/detail_card";
import CardPopup from "../../editor/cards/card_popup";
import { FiPlay, FiRefreshCw, FiArrowLeft, FiArrowRight } from "react-icons/fi";

interface LessonPageProps {
    lesson: CourseLesson;
    courseId: string;
    lessonIdx: number;
    projects: Project[];
}

const LessonPage = ({ lesson, courseId, lessonIdx, projects }: LessonPageProps) => {
    const [isTakingLesson, setIsTakingLesson] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showStartOverModal, setShowStartOverModal] = useState(false);
    const [clickedCard, setClickedCard] = useState<Card | null>(null);
    const [lessonProgress, setLessonProgress] = useState<string | null>(null);
    const [lessonQuizzes, setLessonQuizzes] = useState<Quiz[]>([]);
    const [unlockedCardIds, setUnlockedCardIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (projects.length === 0) {
            setLessonProgress("0%");
            return;
        }

        const calculateProgress = async () => {
            // Calculate lesson progress: highest progress among projects
            if (lesson.cardsToUnlock && lesson.cardsToUnlock.length > 0) {
                if (projects.length > 0) {
                    const totalCards = lesson.cardsToUnlock.length;
                    const progresses: number[] = [];
                    const allUnlockedIds = new Set<string>();
                    for (const project of projects) {
                        try {
                            const cards = await fetchCardsFromProject(project.id);
                            const unlockedCards = cards.filter((card) => card.isUnlocked);
                            unlockedCards.forEach(card => allUnlockedIds.add(card.id));
                            const unlockedCount = unlockedCards.length;
                            progresses.push(Math.round((unlockedCount / totalCards) * 100));
                        } catch (error) {
                            console.error(`Error fetching cards for project ${project.id}:`, error);
                            progresses.push(0);
                        }
                    }
                    const maxProgress = Math.max(...progresses);
                    setLessonProgress(`${maxProgress}%`);
                    setUnlockedCardIds(allUnlockedIds);
                } else {
                    setLessonProgress("0%");
                    setUnlockedCardIds(new Set());
                }
            } else {
                setLessonProgress("0%");
                setUnlockedCardIds(new Set());
            }
        };

        calculateProgress();
    }, [projects, lesson.cardsToUnlock, lesson]);

    useEffect(() => {
        if (lesson.quizIds && lesson.quizIds.length > 0) {
            Promise.all(lesson.quizIds.map(id => getQuiz(id))).then(quizzes => {
                setLessonQuizzes(quizzes.filter(q => q !== null) as Quiz[]);
            }).catch(error => {
                console.error('Error fetching lesson quizzes:', error);
            });
        }
    }, [lesson.quizIds]);

    const handleTakeLesson = async () => {
        // If there are already projects from this lesson, show confirmation
        if (projects.length > 0) {
            setShowConfirmModal(true);
        } else {
            await createProjectFromLesson();
        }
    };

    const handleStartOver = async () => {
        // Show confirmation for starting over
        setShowStartOverModal(true);
    };

    const createProjectFromLesson = async () => {
        setIsTakingLesson(true);
        setShowConfirmModal(false);
        setShowStartOverModal(false);
        try {
            const project = await takeLesson(courseId, lessonIdx);
            if (project) {
                // Redirect to the created project
                window.location.assign(`/projects/${project.id}`);
            } else {
                alert("Failed to create project from lesson. Please try again.");
            }
        } catch (error) {
            console.error("Error taking lesson:", error);
            alert("Failed to create project from lesson. Please try again.");
        } finally {
            setIsTakingLesson(false);
        }
    };

    return (
        <div>
            {lessonProgress !== null && (
                <div className="mb-4">
                    <span className="text-[var(--foreground)] text-sm font-semibold">
                        Lesson Progress: {typeof lessonProgress === 'string' ? lessonProgress : `${lessonProgress}%`}
                    </span>
                </div>
            )}
            {lesson.description ? (
                <p className="text-[var(--foreground)] mb-6">{lesson.description}</p>
            ) : (
                <p className="text-[var(--foreground)] mb-6">No description available.</p>
            )}

            {lesson.cardsToUnlock && lesson.cardsToUnlock.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Cards to Unlock</h3>
                    <div className="flex flex-row gap-8 p-4 w-full overflow-x-auto">
                        {lesson.cardsToUnlock.map((card, index) => (
                            <div key={index} className="shrink-0">
                                <DetailCard
                                    card={{ id: index.toString(), title: card.title, details: card.details, isUnlocked: unlockedCardIds.has(card.id) }}
                                    onClick={() => setClickedCard({ id: index.toString(), title: card.title, details: card.details, isUnlocked: unlockedCardIds.has(card.id) })}
                                    useCheckbox={true}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {projects.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Projects from this lesson</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEdit={() => {}} // No edit functionality for lesson projects
                                setProjects={() => {}} // No delete functionality for lesson projects
                            />
                        ))}
                    </div>
                </div>
             )}

             {lessonQuizzes.length > 0 && (
                 <div className="mb-6">
                     <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Lesson Quizzes</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {lessonQuizzes.map((quiz) => (
                             <div key={quiz.id} className="bg-[var(--neutral-200)] p-4 rounded-lg shadow">
                                 <h4 className="text-lg font-medium text-[var(--foreground)] mb-2">{quiz.title}</h4>
                                 <p className="text-sm text-[var(--neutral-600)] mb-4">{quiz.description}</p>
                                 <Button color="var(--accent-500)" onClick={() => window.open(`/quiz/${quiz.id}`, '_blank')}>
                                     Take Quiz
                                 </Button>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

                <div className="flex justify-center gap-4">
                   {projects.length === 0 ? (
                        <>
                            <FiArrowLeft
                                title="Back to Course"
                                size={32}
                                className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                onClick={() => window.location.href = `/courses/${courseId}`}
                            />
                            <FiPlay
                                title="Take Lesson"
                                size={32}
                                className={`text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer ${isTakingLesson ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleTakeLesson}
                            />
                        </>
                   ) : (() => {
                      const progressPercent = typeof lessonProgress === 'string'
                          ? parseInt(lessonProgress.replace('%', ''))
                          : lessonProgress || 0;

                        if (progressPercent < 100) {
                            return (
                                <>
                                    <FiArrowLeft
                                        title="Back to Course"
                                        size={32}
                                        className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                        onClick={() => window.location.href = `/courses/${courseId}`}
                                    />
                                    <FiPlay
                                        title="Continue Project"
                                        size={32}
                                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                                        onClick={() => window.location.href = `/projects/${projects[0].id}`}
                                    />
                                    <FiRefreshCw
                                        title="Restart Lesson"
                                        size={32}
                                        className={`text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer ${isTakingLesson ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={handleStartOver}
                                    />
                                </>
                            );
                        } else {
                            // Completed lesson: next lesson, restart, back
                            return (
                                <>
                                    <FiArrowLeft
                                        title="Back to Course"
                                        size={32}
                                        className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                        onClick={() => window.location.href = `/courses/${courseId}`}
                                    />
                                    <FiRefreshCw
                                        title="Restart Lesson"
                                        size={32}
                                        className={`text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer ${isTakingLesson ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={handleStartOver}
                                    />
                                    {/* Next lesson - assuming next lesson exists, but for now, placeholder */}
                                    <FiArrowRight
                                        title="Next Lesson"
                                        size={32}
                                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                                        onClick={() => window.location.href = `/courses/${courseId}/${lessonIdx + 1}`}
                                    />
                                </>
                            );
                        }
                  })()}
              </div>

            <Modal
                isOpen={showConfirmModal}
                type="confirm"
                title="Create Another Project?"
                message={`You already have ${projects.length} project${projects.length > 1 ? 's' : ''} from this lesson. Are you sure you want to create another one?`}
                onClose={() => setShowConfirmModal(false)}
                onProceed={createProjectFromLesson}
            />

            <Modal
                isOpen={showStartOverModal}
                type="confirm"
                title="Start Over?"
                message={`This will create a new project for this lesson. Your existing project${projects.length > 1 ? 's' : ''} will remain unchanged.`}
                onClose={() => setShowStartOverModal(false)}
                onProceed={createProjectFromLesson}
            />

            {clickedCard && (
                <CardPopup
                    card={clickedCard}
                    onClose={() => setClickedCard(null)}
                    isPartOfCourseLesson={true}
                />
            )}
        </div>
    );
};

export default LessonPage;