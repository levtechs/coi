import Link from "next/link";
import { useState, useEffect } from "react";

import { FiEdit2 } from "react-icons/fi";
import { FiHome } from "react-icons/fi";

import Button from "../../button";
import CollaboratorsDropdown from "./collabs_dd";
import ShareMenu from "./share";
import ProjectDetailsPanel from "./project_details";
import { ModalContents } from "../types";
import { Project, Quiz, CardFilter } from "@/lib/types";
import { getQuiz } from "@/app/views/quiz";
import TabSelector from "../tab_selector";

interface MenuBarProps {
    project: Project;
    user: { uid: string } | null;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setTitle: (projectId: string, newTitle: string) => Promise<void>;
    setModalContents: (newContent: ModalContents) => void;
    tab: "content" | "cards";
    setTab: (tab: "content" | "cards") => void;
    cardFilters: CardFilter;
    filtersExpanded: boolean;
    setFiltersExpanded: (expanded: boolean) => void;
    toggleKnowledge: () => void;
    toggleResource: () => void;
}

const MenuBar = ( {project, user, addCollaborator, setTitle, setModalContents, tab, setTab, cardFilters, filtersExpanded, setFiltersExpanded, toggleKnowledge, toggleResource} : MenuBarProps) => {
    const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);

    const truncatedTitle = project.title.length > 15 ? project.title.slice(0, 15) + '...' : project.title;

    useEffect(() => {
        const fetchQuizzes = async () => {
            if (!project.quizIds) return;

            const quizzes = await Promise.all(
                project.quizIds.map(async (quizId: string) => {
                    const newQuiz = await getQuiz(quizId);
                    return newQuiz;
                })
            );

            // filter out nulls
            setQuizzes(quizzes.filter((quiz): quiz is Quiz => quiz !== null));
        };

        fetchQuizzes();
    }, [project]);

    return (
        <div className="flex items-center justify-between mb-4 border-b border-[var(--neutral-300)] pb-4">
            {/* Left side: Home + Title + Edit */}
            <div className="flex items-center gap-2">
                <Link href="/dashboard">
                    <FiHome
                        size={32}
                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                    />
                </Link>
                <div className="flex items-center gap-2 group mr-4 ml-4">
                    <h1 className="text-[var(--foreground)] text-2xl font-bold truncate">{truncatedTitle}</h1>
                    <FiEdit2
                        className="text-[var(--accent-500)] cursor-pointer opacity-0 group-hover:opacity-100 hover:text-[var(--accent-600)] transition"
                        size={20}
                        onClick={() =>
                            setModalContents({
                                isOpen: true,
                                type: "input",
                                title: "Edit title",
                                initialValue: "",
                                placeholder: "Enter new title",
                                onSubmit: async (input) => {
                                    if (!user || !input!.trim()) return;

                                    // Update the title in the database
                                    await setTitle(project.id, input!);
                                },
                            })
                        }
                    />
                </div>
                <TabSelector
                    tabs={["content", "cards"]}
                    activeTab={tab}
                    onTabChange={(tabName) => setTab(tabName as "content" | "cards")}
                />
                <div className="relative inline-block ml-4">
                    <div className={`absolute right-0 top-full mt-2 flex space-x-4 transition-opacity duration-300 bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded-md p-2 shadow-md ${filtersExpanded ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${cardFilters[0] === '1' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                            onClick={toggleKnowledge}
                        >
                            Show Knowledge Cards
                        </button>
                        <button
                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${cardFilters[1] === '1' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                            onClick={toggleResource}
                        >
                            Show Resource Cards
                        </button>
                    </div>
                    <button
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        className="px-3 py-1 text-sm bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] rounded-md transition-colors duration-200"
                    >
                        Filters
                    </button>
                </div>
            </div>

            {/* Right side: Share + Collaborators */}
            <div className="flex items-center gap-4">
                <h2 
                    className="text-[var(--foreground)] text-l font-bold hover:underline cursor-pointer"
                    onClick={() => {setModalContents({
                        isOpen: true,
                        type: "confirm",
                        message: "Generate a personalized quiz based on the content of this project",
                        title: "Create quiz",
                        onProceed: async () => window.open(`/quiz?create=true&projectId=${project.id}`),
                    })}}
                >
                    Quiz me!
                </h2>
                <Button 
                    color="var(--neutral-300)" 
                    onClick={()=>{
                        setModalContents({
                            isOpen: true,
                            type: "info",
                            width: "3xl",
                            children: <ProjectDetailsPanel project={project} quizzes={quizzes} />
                        })
                    }}
                > 
                    Details
                </Button>
                <CollaboratorsDropdown 
                    sharedWith={project.sharedWith || []} 
                    ownerId={project.ownerId}
                />
                <ShareMenu 
                    project={project} 
                    user={user} 
                    setModalContents={setModalContents}
                    addCollaborator={addCollaborator}
                />
            </div>
        </div>

    )
}

export default MenuBar
