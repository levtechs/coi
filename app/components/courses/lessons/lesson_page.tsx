"use client";

import { useState, useEffect } from "react";
import { Card } from "@/lib/types/cards";
import { CourseLesson, CourseResource } from "@/lib/types/course";
import CourseResourcePills, { visibleStudentResources } from "../course_resource_pills";
import { Project } from "@/lib/types/project";
import { Quiz } from "@/lib/types/quiz";
import { takeLesson } from "@/app/views/lessons";
import { getQuiz } from "@/app/views/quiz";
import { getCards } from "@/app/views/cards";
import Button from "../../button";
import ProjectCard from "../../dashboard/project_card";
import Modal from "../../modal";
import DetailCard from "../../editor/cards/detail_card";
import CardPopup from "../../editor/cards/card_popup";
import { FiPlay, FiRefreshCw, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import MarkdownArticle from "../../md";

interface LessonPageProps {
    lesson: CourseLesson;
    courseId: string;
    lessonIdx: number;
    totalLessons: number;
    projects: Project[];
    courseResources?: CourseResource[];
}

const LessonPage = ({ lesson, courseId, lessonIdx, totalLessons, projects, courseResources }: LessonPageProps) => {
    const [isTakingLesson, setIsTakingLesson] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showStartOverModal, setShowStartOverModal] = useState(false);
    const [clickedCard, setClickedCard] = useState<Card | null>(null);
    const [lessonProgress, setLessonProgress] = useState<string | null>(null);
    const [lessonQuizzes, setLessonQuizzes] = useState<Quiz[]>([]);
    const [unlockedCardIds, setUnlockedCardIds] = useState<Set<string>>(new Set());
    const [unlockedCardSignatures, setUnlockedCardSignatures] = useState<Set<string>>(new Set());

    const getCardSignature = (card: Pick<Card, "title" | "details">) => JSON.stringify({
        title: card.title.trim().toLowerCase(),
        details: (card.details || []).map((detail) => detail.trim().toLowerCase()),
    });

    const isLessonCardUnlocked = (card: Pick<Card, "id" | "title" | "details">) => {
        if (card.id && unlockedCardIds.has(card.id)) {
            return true;
        }
        return unlockedCardSignatures.has(getCardSignature(card));
    };

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
                    const allUnlockedSignatures = new Set<string>();
                    for (const project of projects) {
                        try {
                            const cards = await getCards(project.id);
                            const unlockedCards = cards.filter((card) => card.isUnlocked);
                            unlockedCards.forEach(card => {
                                allUnlockedIds.add(card.id);
                                allUnlockedSignatures.add(getCardSignature(card));
                            });
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
                    setUnlockedCardSignatures(allUnlockedSignatures);
                } else {
                    setLessonProgress("0%");
                    setUnlockedCardIds(new Set());
                    setUnlockedCardSignatures(new Set());
                }
            } else {
                setLessonProgress("0%");
                setUnlockedCardIds(new Set());
                setUnlockedCardSignatures(new Set());
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

    const displayResources = [...visibleStudentResources(courseResources), ...visibleStudentResources(lesson.resources)];
    const previousLessonHref = lessonIdx > 0 ? `/courses/${courseId}/${lessonIdx - 1}` : null;
    const nextLessonHref = lessonIdx < totalLessons - 1 ? `/courses/${courseId}/${lessonIdx + 1}` : null;

    return (
        <div>
            {lesson.optional && (
                <div className="mb-4 inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-100">
                    Optional lesson
                </div>
            )}
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

            {lesson.guide?.body && (
                <div className="mb-6 bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded-lg p-4">
                    <h3 className="text-xl italic font-semibold text-[var(--neutral-600)] mb-3">Guide</h3>
                    <MarkdownArticle markdown={lesson.guide.body} />
                </div>
            )}

            {displayResources.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">Resources</h3>
                    <CourseResourcePills resources={displayResources} groupLabel="Course and lesson resources" />
                </div>
            )}

            {lesson.cardsToUnlock && lesson.cardsToUnlock.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Cards to Unlock</h3>
                    <div className="flex flex-row gap-8 p-4 w-full overflow-x-auto">
                        {lesson.cardsToUnlock.map((card, index) => (
                            <div key={index} className="shrink-0">
                                <DetailCard
                                    card={{ id: card.id || index.toString(), title: card.title, details: card.details, isUnlocked: isLessonCardUnlocked(card) }}
                                    onClick={() => setClickedCard({ id: card.id || index.toString(), title: card.title, details: card.details, isUnlocked: isLessonCardUnlocked(card) })}
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
                    <div className="flex flex-wrap gap-6">
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
                                  {(quiz.latestAttempt || quiz.bestAttempt) && (
                                      <div className="mb-4 text-sm text-[var(--neutral-600)]">
                                          {quiz.latestAttempt && <p>Latest: {quiz.latestAttempt.totalScore}/{quiz.latestAttempt.maxScore} ({quiz.latestAttempt.percentScore}%)</p>}
                                          {quiz.bestAttempt && <p>Best: {quiz.bestAttempt.totalScore}/{quiz.bestAttempt.maxScore} ({quiz.bestAttempt.percentScore}%)</p>}
                                      </div>
                                  )}
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
                             {previousLessonHref && (
                                 <FiArrowLeft
                                     title="Previous Lesson"
                                     size={32}
                                     className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                     onClick={() => window.location.href = previousLessonHref}
                                 />
                             )}
                             <FiPlay
                                 title="Take Lesson"
                                 size={32}
                                 className={`text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer ${isTakingLesson ? 'opacity-50 cursor-not-allowed' : ''}`}
                                 onClick={handleTakeLesson}
                             />
                             {nextLessonHref && (
                                 <FiArrowRight
                                     title="Next Lesson"
                                     size={32}
                                     className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                     onClick={() => window.location.href = nextLessonHref}
                                 />
                             )}
                         </>
                    ) : (() => {
                      const progressPercent = typeof lessonProgress === 'string'
                          ? parseInt(lessonProgress.replace('%', ''))
                          : lessonProgress || 0;

                        if (progressPercent < 100) {
                            return (
                                <>
                                    {previousLessonHref && (
                                        <FiArrowLeft
                                            title="Previous Lesson"
                                            size={32}
                                            className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                            onClick={() => window.location.href = previousLessonHref}
                                        />
                                    )}
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
                                    {nextLessonHref && (
                                        <FiArrowRight
                                            title="Next Lesson"
                                            size={32}
                                            className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                            onClick={() => window.location.href = nextLessonHref}
                                        />
                                    )}
                                </>
                            );
                        } else {
                            return (
                                <>
                                    {previousLessonHref && (
                                        <FiArrowLeft
                                            title="Previous Lesson"
                                            size={32}
                                            className="text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer"
                                            onClick={() => window.location.href = previousLessonHref}
                                        />
                                    )}
                                    <FiRefreshCw
                                        title="Restart Lesson"
                                        size={32}
                                        className={`text-[var(--neutral-600)] hover:text-[var(--neutral-700)] cursor-pointer ${isTakingLesson ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={handleStartOver}
                                    />
                                    {nextLessonHref && (
                                        <FiArrowRight
                                            title="Next Lesson"
                                            size={32}
                                            className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                                            onClick={() => window.location.href = nextLessonHref}
                                        />
                                    )}
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
