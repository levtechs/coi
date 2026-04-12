"use client";

import { useEffect, useMemo, useState } from "react";

import { User } from "firebase/auth";

import { Course } from "@/lib/types/course";
import { Project } from "@/lib/types/project";
import { getProjects, saveProject, createProject } from "@/app/views/projects";
import { getCourses } from "@/app/views/courses";
import funFacts from "@/lib/fun-facts.json";

import LoadingComponent from "@/app/components/loading";

import ProjectCard from "./project_card";
import Modal from "@/app/components/modal";
import QuickCreateInput from "@/app/components/quick_create_input";

interface DashboardProps {
    user: User | null;
}

type ProjectFilter = "all" | "standalone" | "course";

const LIBRARY_INITIAL = 9;

function isLessonProject(project: Project) {
    return project.courseLesson !== undefined;
}

function sortProjectsLatestFirst(projects: Project[]): Project[] {
    return [...projects]
        .map((p, index) => ({ p, index }))
        .sort((a, b) => {
            const ta = a.p.createdAt ? new Date(a.p.createdAt).getTime() : 0;
            const tb = b.p.createdAt ? new Date(b.p.createdAt).getTime() : 0;
            if (tb !== ta) return tb - ta;
            return b.index - a.index;
        })
        .map(({ p }) => p);
}

function courseLabelProps(project: Project, courseMap: { [courseId: string]: Course }) {
    const id = project.courseLesson?.courseId;
    const course = id ? courseMap[id] : undefined;
    if (!course) return {};
    return { courseLabel: course.title, courseId: course.id };
}

const Dashboard = ({ user }: DashboardProps) => {
    const [isLoading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [showSatPromo, setShowSatPromo] = useState(true);
    const [libraryShowAll, setLibraryShowAll] = useState(false);
    const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const getDailyFact = () => {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const randomIndex = dayOfYear % funFacts.length;
        return funFacts[randomIndex] as string;
    };

    const courseMap = useMemo(
        () =>
            courses.reduce((map, course) => {
                map[course.id] = course;
                return map;
            }, {} as { [courseId: string]: Course }),
        [courses]
    );

    const filteredLibraryProjects = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = projects;
        if (projectFilter === "standalone") {
            list = list.filter((p) => !isLessonProject(p));
        } else if (projectFilter === "course") {
            list = list.filter((p) => isLessonProject(p));
        }
        if (q) {
            list = list.filter((p) => p.title.toLowerCase().includes(q));
        }
        return sortProjectsLatestFirst(list);
    }, [projects, projectFilter, searchQuery]);

    useEffect(() => {
        setLibraryShowAll(false);
    }, [projectFilter, searchQuery]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [projectsData, coursesData] = await Promise.all([getProjects(), getCourses()]);
                setProjects(projectsData);
                setCourses(coursesData);
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

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

        const updatedProjects = await getProjects();
        setProjects(updatedProjects);
    }

    const visibleLibraryProjects = useMemo(
        () =>
            libraryShowAll || filteredLibraryProjects.length <= LIBRARY_INITIAL
                ? filteredLibraryProjects
                : filteredLibraryProjects.slice(0, LIBRARY_INITIAL),
        [filteredLibraryProjects, libraryShowAll]
    );

    const libraryHiddenCount = Math.max(0, filteredLibraryProjects.length - LIBRARY_INITIAL);

    if (!user) return null;

    return (
        <>
            <div className="flex flex-row flex-wrap items-stretch gap-3 w-full min-h-[56px]">
                <button
                    type="button"
                    onClick={openCreateModal}
                    className="shrink-0 min-h-[56px] px-5 rounded-xl border border-[var(--neutral-300)] bg-[var(--neutral-100)]
                        text-[var(--accent-500)] font-semibold whitespace-nowrap
                        hover:bg-[var(--neutral-300)] transition-colors duration-200 flex items-center justify-center"
                >
                    + Create Project
                </button>
                <span className="text-[var(--neutral-400)] text-lg font-light select-none flex items-center" aria-hidden>
                    |
                </span>
                <div className="flex-1 min-w-[12rem] flex min-h-[56px]">
                    <QuickCreateInput autoRedirectOnPending={true} inline className="flex-1" />
                </div>
            </div>

            <section className="mt-10 w-full">
                <div className="flex flex-wrap items-baseline gap-2 mb-4">
                    <h2 className="text-[var(--foreground)] text-lg font-bold">Your projects</h2>
                    {!isLoading && <span className="text-sm text-[var(--neutral-600)]">({projects.length})</span>}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <LoadingComponent small={true} />
                    </div>
                ) : projects.length === 0 ? (
                    <p className="text-sm text-[var(--neutral-600)]">No projects yet.</p>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by title…"
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--neutral-300)] bg-[var(--background)]
                                    text-[var(--foreground)] text-sm outline-none focus:border-[var(--accent-500)]"
                            />
                            <div className="flex flex-wrap gap-2 shrink-0">
                                {(
                                    [
                                        { id: "all" as const, label: "All" },
                                        { id: "standalone" as const, label: "Standalone" },
                                        { id: "course" as const, label: "Course" },
                                    ] as const
                                ).map(({ id, label }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setProjectFilter(id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                            projectFilter === id
                                                ? "border-[var(--accent-500)] bg-[var(--accent-500)] text-white"
                                                : "border-[var(--neutral-300)] bg-[var(--neutral-100)] text-[var(--foreground)] hover:bg-[var(--neutral-200)]"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredLibraryProjects.length === 0 ? (
                            <p className="text-sm text-[var(--neutral-600)]">No projects match your search.</p>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-6">
                                    {visibleLibraryProjects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            onEdit={openEditModal}
                                            setProjects={setProjects}
                                            {...courseLabelProps(project, courseMap)}
                                        />
                                    ))}
                                </div>
                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    {!libraryShowAll && libraryHiddenCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setLibraryShowAll(true)}
                                            className="text-sm font-medium text-[var(--accent-500)] hover:text-[var(--accent-600)] underline-offset-2 hover:underline"
                                        >
                                            Show all ({libraryHiddenCount} more)
                                        </button>
                                    )}
                                    {libraryShowAll && libraryHiddenCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setLibraryShowAll(false)}
                                            className="text-sm font-medium text-[var(--neutral-600)] hover:text-[var(--foreground)] underline-offset-2 hover:underline"
                                        >
                                            Show fewer
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </section>

            <Modal
                isOpen={modalVisible}
                type="input"
                initialValue={editingProject?.title || ""}
                onClose={() => setModalVisible(false)}
                onSubmit={handleModalSubmit}
                title={editingProject ? "Edit Project" : "Create Project"}
            />

            {!isLoading && (
                <p className="text-center text-sm opacity-50 mt-12 pb-4 italic max-w-lg mx-auto px-6">
                    {getDailyFact()}
                </p>
            )}

            {showSatPromo && (
                <div className="fixed bottom-6 right-6 max-w-sm bg-[var(--neutral-100)] border border-[var(--accent-500)] rounded-lg shadow-lg p-4 z-50">
                    <button
                        onClick={() => setShowSatPromo(false)}
                        className="absolute top-2 right-2 text-[var(--neutral-500)] hover:text-[var(--foreground)]"
                    >
                        ×
                    </button>
                    <p className="text-[var(--foreground)] font-semibold mb-2 pr-6">Practice SAT for Free</p>
                    <p className="text-sm text-[var(--neutral-600)] mb-3">
                        Master the SAT with adaptive questions and challenges at sat.coilearn.com
                    </p>
                    <a
                        href="https://sat.coilearn.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-[var(--accent-500)] text-white px-4 py-2 rounded hover:bg-[var(--accent-600)] transition-colors"
                    >
                        Start Practicing →
                    </a>
                </div>
            )}
        </>
    );
};

export default Dashboard;
