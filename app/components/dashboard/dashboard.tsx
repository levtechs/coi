"use client";

import { useEffect, useState } from "react";

import { User } from "firebase/auth";
import { Project } from "@/lib/types";
import { getProjects, saveProject, createProject } from "@/app/views/projects"

import { FiLoader } from "react-icons/fi";

import ProjectCard from "./project_card";
import Modal from "@/app/components/modal";

interface DashboardProps {
    user: User | null;
}

const Dashboard = ({ user }: DashboardProps) => {

    const [isLoading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    // Separate projects into regular and lesson projects
    const isLessonProject = (project: Project) => {
        return project.hierarchy &&
               project.hierarchy.children &&
               project.hierarchy.children.length === 1 &&
               project.hierarchy.children[0].type === 'text';
    };

    const regularProjects = projects.filter(p => !isLessonProject(p));
    const lessonProjects = projects.filter(p => isLessonProject(p));

    useEffect(() => {
        if (!user) return;

        const fetchProjects = async () => {
            setLoading(true);
            try {
                const projects: Project[] = await getProjects();
                setProjects(projects);
            } catch (err) {
                console.error("Failed to fetch projects:", err);
            }
            finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [user]);

    if (!user) return null;

    if (isLoading) return <FiLoader className="animate-spin w-5 h-5 text-[var(--foreground)]" />;

    function openCreateModal() {
        setEditingProject(null);
        setModalVisible(true);
    }

    function openEditModal(project: Project) {
        setEditingProject(project);
        setModalVisible(true);
    }

    async function handleModalSubmit(title: string) {
        if (!title.trim()) return;
        if (!user) return;

        if (editingProject) {
            await saveProject({ ...editingProject, title: title.trim() });
        } else {
            await createProject(title.trim());
        }

        setModalVisible(false);
        setEditingProject(null);

        // Fetch updated projects and set state
        const updatedProjects = await getProjects();
        setProjects(updatedProjects);
    }

    return (
        <>
            {/* Create Project Card - Always shown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div
                    className="flex items-center justify-center border border-[var(--neutral-300)] rounded-lg p-6 cursor-pointer
                            bg-[var(--neutral-100)]
                            hover:bg-[var(--neutral-300)]
                            transition-colors duration-200"
                    onClick={openCreateModal}
                >
                    <span className="text-[var(--accent-500)] font-semibold text-lg">+ Create Project</span>
                </div>
            </div>

            {/* Regular Projects Section */}
            {regularProjects.length > 0 && (
                <div className="mb-8">
                    <p className="text-[var(--foreground)] text-lg mb-4">
                        Your projects
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {regularProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEdit={openEditModal}
                                setProjects={setProjects}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Lesson Projects Section */}
            {lessonProjects.length > 0 && (
                <div>
                    <p className="text-[var(--foreground)] text-lg mb-4">
                        Your lessons
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {lessonProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEdit={openEditModal}
                                setProjects={setProjects}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for Create/Edit */}
            <Modal
                isOpen={modalVisible}
                type = "input"
                initialValue={editingProject?.title || ""}
                onClose={() => setModalVisible(false)}
                onSubmit={handleModalSubmit}
                title={editingProject ? "Edit Project" : "Create Project"}
            />
        </>
    );
};

export default Dashboard;
