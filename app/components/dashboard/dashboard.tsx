"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { User } from "firebase/auth";
import { Project, Course } from "@/lib/types";
import { getProjects, saveProject, createProject } from "@/app/views/projects"
import { getCourses } from "@/app/views/courses";

import LoadingComponent from "@/app/components/loading";

import ProjectCard from "./project_card";
import Modal from "@/app/components/modal";

interface DashboardProps {
    user: User | null;
}

const Dashboard = ({ user }: DashboardProps) => {

    const [isLoading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    // Separate projects into regular and lesson projects
    const isLessonProject = (project: Project) => {
        return project.courseLesson !== undefined;
    };

    const regularProjects = projects.filter(p => !isLessonProject(p));
    const lessonProjects = projects.filter(p => isLessonProject(p));

    // Group lesson projects by course
    const courseMap = courses.reduce((map, course) => {
        map[course.id] = course;
        return map;
    }, {} as { [courseId: string]: Course });

    const lessonProjectsByCourse = lessonProjects.reduce((groups, project) => {
        const courseId = project.courseLesson!.courseId;
        if (!groups[courseId]) {
            groups[courseId] = [];
        }
        groups[courseId].push(project);
        return groups;
    }, {} as { [courseId: string]: Project[] });

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [projectsData, coursesData] = await Promise.all([
                    getProjects(),
                    getCourses()
                ]);
                setProjects(projectsData);
                setCourses(coursesData);
            } catch (err) {
                console.error("Failed to fetch data:", err);
            }
            finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (!user) return null;

    if (isLoading) return <div className="mt-8 flex justify-center"><LoadingComponent small={true} /></div>;

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 mt-6">
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
                    <p className="text-[var(--foreground)] text-lg mb-4 font-bold">
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
            {Object.keys(lessonProjectsByCourse).length > 0 && (
                <div>
                    <p className="text-[var(--foreground)] text-lg mb-4 font-bold">
                        Your lesson projects
                    </p>
                    {Object.entries(lessonProjectsByCourse).map(([courseId, courseProjects]) => {
                        const course = courseMap[courseId];
                        return (
                            <div key={courseId} className="mb-4">
                                <div className="mb-2">
                                  <Link href={`/courses/${courseId}`} className="text-[var(--foreground)] text-sm">
                                      {course.title}
                                  </Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {courseProjects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            onEdit={openEditModal}
                                            setProjects={setProjects}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
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
