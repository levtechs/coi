import Link from "next/link";
import { useState, useEffect } from "react";

import { FiEdit2 } from "react-icons/fi";
import { FiHome } from "react-icons/fi";

import Button from "../../button";
import CollaboratorsDropdown from "./collabs_dd";
import ShareMenu from "./share";
import { ModalContents } from "../types";
import { Project, Quiz } from "@/lib/types";
import { getQuiz } from "@/app/views/quiz";

interface MenuBarProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setTitle: (projectId: string, newTitle: string) => Promise<void>;
    setModalContents: (newContent: ModalContents) => void
}

const MenuBar = ( {project, user, setProject, addCollaborator, setTitle, setModalContents} : MenuBarProps) => {
    const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);

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
                    <h1 className="text-[var(--foreground)] text-2xl font-bold">{project.title}</h1>
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

                                    // Update local state
                                    setProject((prev) =>
                                        prev ? { ...prev, title: input!.trim() } : prev
                                    );
                                },
                            })
                        }
                    />
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
                            width: "lg",
                            children: (
                                <div className="mb-4">
                                    <h1 className="text-3xl mb-8 font-bold underline">
                                        Project details
                                    </h1>
                                    <h2 className="text-xl mb-2 font-bold">
                                        Available quizes:
                                    </h2>
                                    <div className="text-md flex flex-col gap-1 mb-4">
                                        {project.quizIds && project.quizIds.length > 0 ? (
                                            <>
                                                {quizzes ? (
                                                    <>
                                                        {quizzes.map((quiz: Quiz) => {
                                                            if (!quiz.id) return (
                                                                <p key={quiz.title}>
                                                                    {quiz.title}
                                                                </p>
                                                            )
                                                            return (
                                                                <a key={quiz.id} className="underline" href={`/quiz/${quiz.id}`} target="_blank" rel="noopener noreferrer">
                                                                    {quiz.title.length > 45 ? quiz.title.slice(0, 45) + "..." : quiz.title}
                                                                </a>
                                                            )
                                                        })}
                                                    </>
                                                ) : (
                                                    <>
                                                    {project.quizIds?.map((id: string) => {
                                                        return (<a key={id} className="underline" href={`/quiz/${id}`} target="_blank" rel="noopener noreferrer">{id}</a>)
                                                    })}
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <p className="italic">No quizzes found.</p>
                                        )}
                                    </div>
                                    <h2 className="text-xl mb-2 mt-2 font-bold">
                                        Collaborators:
                                    </h2>
                                    <div className="text-md flex flex-col gap-1 mb-4">
                                        {project.collaborators.map((id: string) => {
                                            return (
                                                <a key={id} className="underline" href={`/profile/user/${id}`} target="_blank" rel="noopener noreferrer">
                                                    {id}
                                                </a>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
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
                    setProject={setProject}
                />
            </div>
        </div>

    )
}

export default MenuBar