"use client";

import { useState, useEffect } from "react";
import { CourseLesson, Project } from "@/lib/types";
import { takeLesson } from "@/app/views/lessons";
import { getProject } from "@/app/views/projects";
import Button from "../../button";
import ProjectCard from "../../dashboard/project_card";
import LoadingComponent from "../../loading";
import Modal from "../../modal";

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

    useEffect(() => {
        const fetchProjects = async () => {
            if (projectIds.length === 0) return;
            setLoadingProjects(true);
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
                setProjects(fetchedProjects.filter((p): p is Project => p !== null));
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoadingProjects(false);
            }
        };
        fetchProjects();
    }, [projectIds]);

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
            {lesson.description ? (
                <p className="text-[var(--foreground)] mb-6">{lesson.description}</p>
            ) : (
                <p className="text-[var(--foreground)] mb-6">No description available.</p>
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
        </div>
    );
};

export default LessonPage;