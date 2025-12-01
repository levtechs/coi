"use client";

import { Timestamp } from "firebase/firestore";
import { Project, Quiz } from "@/lib/types";
import { getQuiz } from "@/app/views/quiz";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
import { useState, useEffect } from "react";

interface ProjectDetailsPanelProps {
    project: Project;
    quizzes: Quiz[] | null;
}

const ProjectDetailsPanel = ({ project, quizzes }: ProjectDetailsPanelProps) => {
    const [lessonQuizzes, setLessonQuizzes] = useState<Quiz[]>([]);
    const [unlockedCards, setUnlockedCards] = useState<number>(0);

    useEffect(() => {
        const fetchLessonQuizzes = async () => {
            if (project.courseLesson?.quizIds && project.courseLesson.quizIds.length > 0) {
                const fetched = await Promise.all(
                    project.courseLesson.quizIds.map(id => getQuiz(id))
                );
                setLessonQuizzes(fetched.filter(q => q !== null) as Quiz[]);
            }
        };
        fetchLessonQuizzes();
    }, [project.courseLesson]);

    useEffect(() => {
        const fetchUnlockedCards = async () => {
            if (project.courseLesson?.cardsToUnlock) {
                try {
                    const cards = await fetchCardsFromProject(project.id);
                    const unlocked = cards.filter(card => project.courseLesson!.cardsToUnlock.some(lc => lc.id === card.id)).length;
                    setUnlockedCards(unlocked);
                } catch (error) {
                    console.error("Error fetching unlocked cards:", error);
                }
            }
        };
        fetchUnlockedCards();
    }, [project]);

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

    return (
        <div className="mb-4">
            <h1 className="text-3xl mb-8 font-bold underline">
                Project details
            </h1>
            {project.courseLesson && (
                <div className="mb-6">
                    <h2 className="text-xl mb-2 font-bold">
                        Associated Lesson:
                    </h2>
                    <a
                        href={`/courses/${project.courseId}/${project.courseLesson.index}`}
                        className="block text-md mb-4 p-3 bg-[var(--neutral-100)] rounded-md hover:bg-[var(--neutral-200)] transition-colors cursor-pointer"
                    >
                        <p className="font-semibold">{project.courseLesson.title}</p>
                        <p className="text-[var(--neutral-600)] mb-2">{project.courseLesson.description}</p>
                        <p className="text-sm">Cards unlocked: {unlockedCards}/{project.courseLesson.cardsToUnlock?.length || 0}</p>
                    </a>
                    {lessonQuizzes.length > 0 && (
                        <div className="mt-2">
                            <p className="text-sm font-semibold">Lesson Quiz:</p>
                            {lessonQuizzes.map((quiz, index) => (
                                <a key={quiz.id || index} className="underline text-sm font-bold mr-2" href={`/quiz/${quiz.id}`} target="_blank" rel="noopener noreferrer">
                                    {quiz.title}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {project.collaborators.length > 0 && (
                <>
                <h2 className="text-xl mb-2 mt-2 font-bold">
                    Collaborators:
                </h2>
                <div className="text-md flex flex-col gap-1 mb-4">
                    {project.collaborators.map((email: string, index: number) => {
                        return (
                            <a key={project.sharedWith[index]} className="underline" href={`/profile/user/${project.sharedWith[index]}`} target="_blank" rel="noopener noreferrer">
                                {email}
                            </a>
                        )
                    })}
                </div>
                 </>
             )}
             <h2 className="text-xl mb-2 font-bold">
                 Available quizzes:
             </h2>
             <div className="text-md flex flex-col gap-1 mb-4">
                 {project.quizIds && project.quizIds.length > 0 ? (
                     <>
                         {quizzes ? (
                             <>
                                 {quizzes.map((quiz: Quiz) => {
                                     let date: Date | null = null;
                                     if (quiz.createdAt) {
                                         if (typeof quiz.createdAt === 'string') {
                                             date = new Date(quiz.createdAt);
                                         } else if (quiz.createdAt instanceof Timestamp) {
                                             date = quiz.createdAt.toDate();
                                         }
                                     }
                                      if (!quiz.id) return (
                                          <div key={quiz.title} className="flex flex-col">
                                              <p>{quiz.title}</p>
                                              {date && <p className="italic text-[var(--neutral-500)]">created {timeAgo(date)} • {formatQuestionCounts(quiz)}</p>}
                                          </div>
                                      )
                                      return (
                                          <div key={quiz.id} className="flex flex-col">
                                              <a className="underline" href={`/quiz/${quiz.id}`} target="_blank" rel="noopener noreferrer">
                                                  {quiz.title.length > 45 ? quiz.title.slice(0, 45) + "..." : quiz.title}
                                              </a>
                                              {date && <p className="italic text-[var(--neutral-500)]">created {timeAgo(date)} • {formatQuestionCounts(quiz)}</p>}
                                          </div>
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
         </div>
     );
};

export default ProjectDetailsPanel;