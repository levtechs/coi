"use client";

import { useState, useEffect } from "react";
import { CourseLesson, Project, Card } from "@/lib/types";
import { takeLesson } from "@/app/views/lessons";
import { getProject } from "@/app/views/projects";
import { getCards } from "@/app/views/cards";
import Button from "../../button";
import ProjectCard from "../../dashboard/project_card";
import LoadingComponent from "../../loading";
import Modal from "../../modal";
import DetailCard from "../../editor/cards/detail_card";
import CardPopup from "../../editor/cards/card_popup";

interface LessonPageProps {
    lesson: CourseLesson;
    courseId: string;
    lessonIdx: number;
    projectIds: string[];
}

const LessonPage = ({ lesson, courseId, lessonIdx, projectIds }: LessonPageProps) => {
    const [isTakingLesson, setIsTakingLesson] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [clickedCard, setClickedCard] = useState<Card | null>(null);
    const [lessonProgress, setLessonProgress] = useState<string | null>(null);

    useEffect(() => {
        if (projectIds.length === 0) {
            setLessonProgress("0%");
            return;
        }
        const fetchProjects = async () => {
            setLoadingProjects(true);
            setLessonProgress("Loading lesson progress...");
            try {
                const fetchedProjects = await Promise.all(
                    projectIds.map(async (projectId) => {
                        try {
                            return await getProject(projectId);
                        } catch (error) {
                            console.error(`Failed to fetch project ${projectId}:`, error);
                            return null;
                        }
                    })
                );
                const validProjects = fetchedProjects.filter((p): p is Project => p !== null);
                setProjects(validProjects);

                // Calculate lesson progress: highest progress among projects
                if (lesson.cardsToUnlock && lesson.cardsToUnlock.length > 0) {
                    if (validProjects.length > 0) {
                        const totalCards = lesson.cardsToUnlock.length;
                        const progresses = await Promise.all(
                            validProjects.map(async (project) => {
                                try {
                                    const cards = await getCards(project.id);
                                    const unlockedCount = cards.filter((card) => card.isUnlocked).length;
                                    return Math.round((unlockedCount / totalCards) * 100);
                                } catch (error) {
                                    console.error(`Failed to fetch cards for project ${project.id}:`, error);
                                    return 0;
                                }
                            })
                        );
                        const maxProgress = Math.max(...progresses);
                        setLessonProgress(`${maxProgress}%`);
                    } else {
                        setLessonProgress("0%");
                    }
                } else {
                    setLessonProgress("0%");
                }
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoadingProjects(false);
            }
        };
        fetchProjects();
    }, [projectIds, lesson.cardsToUnlock]);

    const handleTakeLesson = async () => {
        // If there are already projects from this lesson, show confirmation
        if (projects.length > 0) {
            setShowConfirmModal(true);
        } else {
            await createProjectFromLesson();
        }
    };

    const createProjectFromLesson = async () => {
        setIsTakingLesson(true);
        setShowConfirmModal(false);
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
                                    card={{ id: index.toString(), title: card.title, details: card.details }}
                                    onClick={() => setClickedCard({ id: index.toString(), title: card.title, details: card.details })}
                                    isFromCourse={true}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loadingProjects ? (
                <div className="mb-6">
                    <LoadingComponent small={true} loadingText="Loading projects" />
                </div>
            ) : projects.length > 0 && (
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

            <div className="flex justify-center">
                <Button
                    color="var(--accent-500)"
                    onClick={handleTakeLesson}
                    disabled={isTakingLesson}
                >
                    {isTakingLesson ? "Creating Project..." : "Take This Lesson"}
                </Button>
            </div>

            <Modal
                isOpen={showConfirmModal}
                type="confirm"
                title="Create Another Project?"
                message={`You already have ${projects.length} project${projects.length > 1 ? 's' : ''} from this lesson. Are you sure you want to create another one?`}
                onClose={() => setShowConfirmModal(false)}
                onProceed={createProjectFromLesson}
            />

            {clickedCard && (
                <CardPopup
                    card={clickedCard}
                    onClose={() => setClickedCard(null)}
                />
            )}
        </div>
    );
};

export default LessonPage;