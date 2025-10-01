import { Timestamp } from "firebase/firestore";
import { Project, Quiz } from "@/lib/types";

interface ProjectDetailsPanelProps {
    project: Project;
    quizzes: Quiz[] | null;
}

const ProjectDetailsPanel = ({ project, quizzes }: ProjectDetailsPanelProps) => {
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

    return (
        <div className="mb-4">
            <h1 className="text-3xl mb-8 font-bold underline">
                Project details
            </h1>
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
                                            {date && <p className="italic text-[var(--neutral-500)]">created {timeAgo(date)}</p>}
                                        </div>
                                    )
                                    return (
                                        <div key={quiz.id} className="flex flex-col">
                                            <a className="underline" href={`/quiz/${quiz.id}`} target="_blank" rel="noopener noreferrer">
                                                {quiz.title.length > 45 ? quiz.title.slice(0, 45) + "..." : quiz.title}
                                            </a>
                                            {date && <p className="italic text-[var(--neutral-500)]">created {timeAgo(date)}</p>}
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
        </div>
    );
};

export default ProjectDetailsPanel;