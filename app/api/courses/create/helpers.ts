import { Course, CourseLesson, Card } from "@/lib/types";

type NewCourse = Omit<Course, "id">;
type NewLesson = Omit<CourseLesson, "id" | "courseId">;

export const createLessonFromText = async (text: string): Promise<NewLesson> => {
    // Placeholder implementation - in real implementation, this would use AI to parse text
    const sampleCards: Card[] = [
        {
            id: "card-1",
            title: "Key Concept",
            details: ["Important point from the text", "Another detail"],
        },
        {
            id: "card-2",
            title: "Summary",
            details: ["Brief overview of the content"],
        }
    ];

    return {
        index: 0,
        title: "Lesson from Text",
        description: text.length > 100 ? text.substring(0, 100) + "..." : text,
        cardsToUnlock: sampleCards,
        quizIds: []
    };
};

export const createCourseFromText = async (text: string): Promise<NewCourse> => {
    // Placeholder implementation - in real implementation, this would use AI to structure the course
    const lesson1 = await createLessonFromText(text);
    const lesson2 = await createLessonFromText("Additional content for second lesson");

    return {
        title: "Course from Text",
        description: text.length > 200 ? text.substring(0, 200) + "..." : text,
        lessons: [lesson1, { ...lesson2, index: 1, title: "Advanced Concepts" }],
        public: false,
        sharedWith: []
    };
};
