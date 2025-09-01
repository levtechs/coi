"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import { Project } from "@/lib/types";
import { getProjects, saveProject, createProject } from "@/app/views/projects"

import ProjectCard from "./project_card";
import Modal from "@/app/components/modal";

const Dashboard = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchProjects = async () => {
            try {
                const projects: Project[] = await getProjects();
                setProjects(projects);
            } catch (err) {
                console.error("Failed to fetch projects:", err);
            }
        };

        fetchProjects();
    }, [user]);

    if (!user) return null;

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create Project Card */}
                <div
                    className="flex items-center justify-center border border-[var(--neutral-300)] rounded-lg p-6 cursor-pointer
                            bg-[var(--neutral-100)]
                            hover:bg-[var(--neutral-300)]
                            transition-colors duration-200"
                    onClick={openCreateModal}
                >
                    <span className="text-[var(--accent-500)] font-semibold text-lg">+ Create Project</span>
                </div>


                {/* Project Cards */}
                {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} onEdit={openEditModal} />
                ))}
            </div>

            {/* Modal for Create/Edit */}
            <Modal
                isOpen={modalVisible}
                initialValue={editingProject?.title || ""}
                onClose={() => setModalVisible(false)}
                onSubmit={handleModalSubmit}
                title={editingProject ? "Edit Project" : "Create Project"}
            />
        </>
    );
};

export default Dashboard;
