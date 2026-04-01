import { CourseLesson } from "@/lib/types/course";
import { Project } from "@/lib/types/project";
import { FiArrowUpRight, FiPlay } from "react-icons/fi";

interface LessonCardProps {
    lesson: CourseLesson;
    courseId: string;
    projects: Project[];
}

const LessonCard = ({ lesson, courseId, projects }: LessonCardProps) => {
    const hasProject = projects.length > 0;
    const projectCountLabel = projects.length === 1 ? "1 attempt" : `${projects.length} attempts`;
    const latestProject = hasProject ? projects[projects.length - 1] : null;

    return (
        <div
            className="relative border border-[var(--neutral-300)] rounded-xl p-6 bg-[var(--neutral-200)] shadow hover:shadow-md hover:border-[var(--accent-300)] transition h-full w-full min-h-[220px] overflow-hidden group"
        >
            <div
                className="cursor-pointer h-full flex flex-col"
                onClick={() => window.location.assign(`/courses/${courseId}/${lesson.index}`)}
            >
                <div className="absolute top-4 right-4">
                    <FiArrowUpRight className="w-5 h-5 text-[var(--neutral-500)] group-hover:text-[var(--neutral-700)] transition-colors" />
                </div>

                <div className="pr-14 mb-5">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <div className="inline-flex items-center rounded-full border border-[var(--neutral-300)] bg-[var(--neutral-100)] px-3 py-1 text-xs font-medium text-[var(--neutral-700)]">
                            {hasProject ? projectCountLabel : "Not started"}
                        </div>
                        {lesson.optional && (
                            <div className="inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                                Optional
                            </div>
                        )}
                    </div>

                    <h3 className="text-[var(--foreground)] font-semibold text-xl leading-tight">{`${lesson.index + 1}. ${lesson.title}`}</h3>
                    {lesson.description && (
                        <p className="text-[var(--foreground)] text-sm mt-3 line-clamp-3 text-[var(--neutral-700)]">{lesson.description}</p>
                    )}
                </div>

                <div className="mt-auto flex items-end justify-between gap-4 pt-4 border-t border-[var(--neutral-300)]">
                    <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                            {hasProject ? "Continue lesson" : "Start lesson"}
                        </p>
                        <p className="text-xs text-[var(--neutral-600)] mt-1">
                            {hasProject ? "Open the lesson page to continue or restart your work." : "Open the lesson page and create your first project."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {latestProject && (
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-300)] bg-[var(--neutral-100)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--neutral-300)] transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.assign(`/projects/${latestProject.id}`);
                                }}
                                title="Open latest project"
                            >
                                <FiPlay className="w-3.5 h-3.5" />
                                Project
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonCard;
