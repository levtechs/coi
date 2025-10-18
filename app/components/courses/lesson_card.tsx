
interface LessonCardProps {
    lesson: CourseLesson;
    courseId: string;
    projects: Project[];
}

const LessonCard = ({ lesson, courseId, projects }: LessonCardProps) => {
    return (
        <div className="border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] shadow hover:shadow-md transition">
            <div
                className="cursor-pointer"
                onClick={() => window.location.assign(`/courses/${courseId}/${lesson.index}`)}
            >
                <h3 className="text-[var(--foreground)] font-semibold text-xl">{`${lesson.index + 1}. ${lesson.title}`}</h3>
                {lesson.description && (
                    <p className="text-[var(--foreground)] text-sm mt-2 line-clamp-2">{lesson.description}</p>
                )}
            </div>

            {projects.length > 0 && (
                <div className="mt-4">
                    <p className="text-[var(--foreground)] text-sm font-medium mb-2">Projects ({projects.length})</p>
                    <div className="space-y-2">
                        {projects.slice(0, 3).map((project) => (
                            <div
                                key={project.id}
                                className="bg-[var(--neutral-100)] p-2 rounded text-sm cursor-pointer hover:bg-[var(--neutral-300)] transition"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.assign(`/projects/${project.id}`);
                                }}
                            >
                                {project.title}
                            </div>
                        ))}
                        {projects.length > 3 && (
                            <p className="text-[var(--neutral-600)] text-xs">+{projects.length - 3} more</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonCard;
