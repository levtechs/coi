import Link from "next/link";
import { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";

import { FiEdit2 } from "react-icons/fi";
import { FiHome } from "react-icons/fi";

import Button from "../../button";
import CollaboratorsDropdown from "./collabs_dd";
import ShareMenu from "./share";
import ProjectDetailsPanel from "./project_details";
import StudyPanel from "../study/study_panel";
import UploadsPanel from "../uploads/uploads_panel";
import { ModalContents } from "../types";
import { Project, Quiz, CardFilter, ChatAttachment } from "@/lib/types";
import { getQuiz } from "@/app/views/quiz";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
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
    toggleImportant: () => void;
    addFileAttachment: (attachment: ChatAttachment) => void;
}

const MenuBar = ( {project, user, addCollaborator, setTitle, setModalContents, tab, setTab, cardFilters, filtersExpanded, setFiltersExpanded, toggleKnowledge, toggleResource, toggleImportant, addFileAttachment} : MenuBarProps) => {
    const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
    const [lessonProgress, setLessonProgress] = useState<number | null>(null);

    const truncatedTitle = project.title.length > 15 ? project.title.slice(0, 15) + '...' : project.title;

    // Check if this project is from a lesson
    const isLessonProject = !!project.courseLesson;

    const timeAgo = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
        const years = Math.floor(days / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
    };

    const formatQuestionCounts = (quiz: Quiz): string => {
        const mcqCount = quiz.questions.filter(q => q.type === 'MCQ').length;
        const frqCount = quiz.questions.filter(q => q.type === 'FRQ').length;

        if (mcqCount > 0 && frqCount > 0) {
            return `${mcqCount} multiple choice + ${frqCount} short answer`;
        } else if (mcqCount > 0) {
            return `${mcqCount} multiple choice`;
        } else if (frqCount > 0) {
            return `${frqCount} short answer`;
        }
        return '';
    };

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

    useEffect(() => {
        const fetchLessonProgress = async () => {
            if (!isLessonProject || !project.courseLesson?.cardsToUnlock) return;

            try {
                const cards = await fetchCardsFromProject(project.id);
                const unlockedCount = cards.filter(card => card.isUnlocked).length;
                const totalCount = project.courseLesson.cardsToUnlock.length;
                const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 100;
                setLessonProgress(progress);
            } catch (error) {
                console.error("Error fetching lesson progress:", error);
            }
        };

        fetchLessonProgress();
    }, [project, isLessonProject]);

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
                <div className="flex items-center gap-2 group mr-2 ml-4">
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
                <div className="ml-2">
                    <TabSelector
                        tabs={["content", "cards"]}
                        activeTab={tab}
                        onTabChange={(tabName) => setTab(tabName as "content" | "cards")}
                    />
                </div>
                <div className="relative inline-block ml-2">
                    <div className={`absolute left-0 top-full mt-2 flex flex-wrap gap-2 transition-opacity duration-300 bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded-md p-2 shadow-md z-50 min-w-fit ${filtersExpanded ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${cardFilters.knowledge ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                            onClick={toggleKnowledge}
                        >
                            Show Knowledge Cards
                        </button>
                        <button
                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${cardFilters.resource ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                            onClick={toggleResource}
                        >
                            Show Resource Cards
                        </button>
                        <button
                            className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${cardFilters.important ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                            onClick={toggleImportant}
                        >
                            Show Important Cards
                        </button>
                    </div>
                    <button
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        className="px-3 py-1 text-sm bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] rounded-md transition-colors duration-200"
                    >
                        Filters
                    </button>
                </div>
                <button
                    className="px-3 py-1 text-sm bg-[var(--neutral-200)] text-[var(--foreground)] hover:bg-[var(--neutral-300)] rounded-md transition-colors duration-200 ml-2 whitespace-nowrap"
                    onClick={() => {setModalContents({
                        isOpen: true,
                        type: "empty",
                        width: "3xl",
                        children: (
                            <div className="mb-2">
                                <h1 className="text-2xl mb-6 font-bold underline">
                                    Quizzes
                                </h1>
                                <h2 className="text-lg mb-2 font-bold">
                                    Available quizzes:
                                </h2>
                                <div className="text-md flex flex-col gap-1 mb-4">
                                    {quizzes && quizzes.length > 0 ? (
                                        quizzes.map((quiz: Quiz) => {
                                            let date: Date | null = null;
                                            if (quiz.createdAt) {
                                                if (typeof quiz.createdAt === 'string') {
                                                    date = new Date(quiz.createdAt);
                                                } else if (quiz.createdAt instanceof Timestamp) {
                                                    date = quiz.createdAt.toDate();
                                                }
                                            }
                                             return (
                                                 <div key={quiz.id} className="flex flex-col">
                                                     <a className="underline" href={`/quiz/${quiz.id}`} target="_blank" rel="noopener noreferrer">
                                                         {quiz.title.length > 45 ? quiz.title.slice(0, 45) + "..." : quiz.title}
                                                     </a>
                                                     {date && <p className="italic text-[var(--neutral-500)]">created {timeAgo(date)} • {formatQuestionCounts(quiz)}</p>}
                                                 </div>
                                             )
                                        })
                                    ) : (
                                        <p className="italic">No quizzes found.</p>
                                    )}
                                </div>
                                <div className="flex w-full gap-4">
                                    <Button
                                        className="flex-1"
                                        color="var(--neutral-300)"
                                        onClick={() => setModalContents({isOpen: false, type: "empty"})}
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        color="var(--accent-500)"
                                        onClick={() => window.open(`/quiz?create=true&projectId=${project.id}`, '_blank')}
                                    >
                                        Create new quiz
                                    </Button>
                                </div>
                            </div>
                        ),
                    })}}
                >
                    Quiz me!
                </button>
                <button
                    className="px-3 py-1 text-sm bg-[var(--neutral-200)] text-[var(--foreground)] hover:bg-[var(--neutral-300)] rounded-md transition-colors duration-200 ml-2 whitespace-nowrap"
                     onClick={() => {
                         setModalContents({
                             isOpen: true,
                             type: "info",
                             width: "4xl",
                             children: <StudyPanel cards={project.cards.filter(card => !card.url)} />
                         });
                     }}
                >
                    Review
                </button>
                 <button
                     className="px-3 py-1 text-sm bg-[var(--neutral-200)] text-[var(--foreground)] hover:bg-[var(--neutral-300)] rounded-md transition-colors duration-200 ml-2 whitespace-nowrap"
                      onClick={() => {
                          setModalContents({
                              isOpen: true,
                              type: "info",
                              width: "4xl",
                               children: <UploadsPanel addFileAttachment={addFileAttachment} projectId={project.id} />
                          });
                      }}
                 >
                     Uploads
                 </button>
            </div>

            {/* Right side: Share + Collaborators */}
            <div className="flex items-center gap-4">
                 {isLessonProject && project.courseId && (
                      <Button
                          color="var(--neutral-300)"
                          onClick={() => window.open(`/courses/${project.courseId}/${project.courseLesson!.index}`, '_blank')}
                          className="flex items-center gap-2"
                      >
                          <span className="text-white">View Lesson</span>
                          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 36 36">
                              <circle
                                  cx="18"
                                  cy="18"
                                  r="16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  opacity="0.5"
                              />
                              <circle
                                  cx="18"
                                  cy="18"
                                  r="16"
                                  fill="none"
                                  stroke="var(--accent-500)"
                                  strokeWidth="2"
                                  strokeDasharray={`${lessonProgress} 100`}
                                  strokeLinecap="round"
                                  transform="rotate(-90 18 18)"
                              />
                              <text
                                  x="18"
                                  y="21"
                                  textAnchor="middle"
                                  fontSize="8"
                                  fill="white"
                                  fontWeight="bold"
                              >
                                  {lessonProgress}%
                              </text>
                          </svg>
                      </Button>
                  )}
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
