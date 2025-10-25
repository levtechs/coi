import { apiFetch } from "./helpers";
import React from "react";
import { auth } from "@/lib/firebase";

import { Course, CourseLesson, NewCard, Project, NewLesson, QuizSettings } from "@/lib/types";

type NewCourse = Omit<Course, "id" | "lessons"> & { lessons: NewLesson[] };
type CourseLessonForm = Omit<NewLesson, "index"> & { id?: string; };

export async function getCourses(): Promise<Course[]> {
    try {
        const data = await apiFetch<Course[]>(`/api/courses`, {
            method: "GET",
        });
        return data || [];
    } catch (err) {
        console.error("Error fetching courses:", err);
        return [];
    }
}

export async function getCourse(courseId: string): Promise<{ course: Course; lessonProjects: { [lessonId: string]: Project[] } } | null> {
    try {
        const data = await apiFetch<{ course: Course; lessonProjects: { [lessonId: string]: Project[] } }>(`/api/courses/${courseId}`, {
            method: "GET",
        });
        if (data) data.course.id = courseId;
        return data;
    } catch (err) {
        console.error("Error fetching course:", err);
        return null;
    }
}

export async function createCourse(courseData: NewCourse): Promise<Course | null> {
    try {
        const data = await apiFetch<Course>(`/api/courses/create`, {
            method: "POST",
            body: JSON.stringify(courseData),
        });
        return data;
    } catch (err) {
        console.error("Error creating course:", err);
        return null;
    }
}

export async function generateCourseFromText(text: string): Promise<NewCourse | null> {
    try {
        const data = await apiFetch<NewCourse>(`/api/courses/create`, {
            method: "PUT",
            body: JSON.stringify({ text }),
        });
        return data;
    } catch (err) {
        console.error("Error generating course from text:", err);
        return null;
    }
}

export async function generateLessonFromText(text: string): Promise<NewLesson | null> {
    try {
        const data = await apiFetch<NewLesson>(`/api/courses/create`, {
            method: "PATCH",
            body: JSON.stringify({ text }),
        });
        return data;
    } catch (err) {
        console.error("Error generating lesson from text:", err);
        return null;
    }
}

export async function updateCourse(courseId: string, courseData: Omit<Course, "id">): Promise<boolean> {
    try {
        await apiFetch(`/api/courses/${courseId}`, {
            method: "PUT",
            body: JSON.stringify(courseData),
        });
        return true;
    } catch (err) {
        console.error("Error updating course:", err);
        return false;
    }
}

export async function deleteCourse(courseId: string): Promise<boolean> {
    try {
        await apiFetch(`/api/courses/${courseId}`, {
            method: "DELETE",
        });
        return true;
    } catch (err) {
        console.error("Error deleting course:", err);
        return false;
    }
}

export async function fetchAnalytics(courseId: string): Promise<{ totalUsers: number; invitations: { token: string; createdAt: string; createdBy?: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[]; } | null> {
    try {
        const data = await apiFetch<{ totalUsers: number; invitations: { token: string; createdAt: string; createdBy?: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[]; }>(`/api/courses/${courseId}/analytics`, {
            method: "GET",
        });
        return data;
    } catch (err) {
        console.error("Error fetching analytics:", err);
        return null;
    }
}

/**
 * Streams a course generation from the API.
 * @param text The text to generate the course from.
 * @param onUpdate Callback for each progress update message.
 * @param setCourseTitle Setter for course title.
 * @param setCourseDescription Setter for course description.
 * @param setLessons Setter for lessons.
 * @param setCollapsedLessons Setter for collapsed lessons.
 * @param setCollapsedCards Setter for collapsed cards.
 * @returns Resolves when generation is complete.
 */
export async function streamGenerateCourse(
    text: string,
    onUpdate: (message: string) => void,
    setCourseTitle: (title: string) => void,
    setCourseDescription: (description: string) => void,
    setLessons: React.Dispatch<React.SetStateAction<CourseLessonForm[]>>,
    setCollapsedLessons: (collapsed: boolean[]) => void,
    setCollapsedCards: (cards: { [key: number]: boolean[] }) => void,
    setCourseQuizIds: (quizIds: string[]) => void,
    setCourseQuizzes: React.Dispatch<React.SetStateAction<{id?: string, status: 'creating' | 'created', title?: string}[]>>,
    finalQuizSettings?: QuizSettings,
    lessonQuizSettings?: QuizSettings,
): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const idToken = await user.getIdToken();
    const res = await fetch("/api/courses/create", {
        method: "PUT",
        body: JSON.stringify({ text, finalQuizSettings, lessonQuizSettings }),
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
        },
    });

    if (!res.body) throw new Error("No response body from stream");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();

        if (value) {
            buffer += decoder.decode(value, { stream: true });
        }

        // If stream ended, flush any remaining bytes from the decoder
        if (done) {
            buffer += decoder.decode();
        }

        let pos = 0; // position cursor while scanning buffer for complete updates

        while (true) {
            const updateStart = buffer.indexOf("\n", pos);
            if (updateStart === -1) break;

            const jsonStr = buffer.slice(pos, updateStart);
            pos = updateStart + 1; // advance past this update

            if (jsonStr.trim()) {
                try {
                    const update = JSON.parse(jsonStr.trim());
                    if (update.type === 'status') {
                        onUpdate(update.message);
                    } else if (update.type === 'outline') {
                        onUpdate(`Course outline created: ${update.courseStructure.courseTitle} (${update.courseStructure.lessons.length} lessons)`);
                        const numLessons = update.courseStructure.lessons.length;
                        // Pre-populate lessons array to avoid sparse arrays later
                        setLessons(Array(numLessons).fill(null).map(() => ({
                            title: '',
                            description: '',
                            content: '',
                            cardsToUnlock: [],
                            quizIds: []
                        })));
                    } else if (update.type === 'lesson_start') {
                        onUpdate(`Generating content for lesson ${update.lessonNumber}: ${update.lessonTitle}`);
                    } else if (update.type === 'lesson_complete') {
                        setLessons((prev: CourseLessonForm[]) => {
                            const updated = [...prev];
                            updated[update.lessonNumber - 1] = {
                                title: update.lesson.title,
                                description: update.lesson.description,
                                content: update.lesson.content,
                                cardsToUnlock: update.lesson.cardsToUnlock,
                                quizIds: update.lesson.quizIds,
                            };
                            return updated;
                        });
                        onUpdate(`Completed lesson ${update.lessonNumber}: ${update.lesson.title} (${update.cardCount} cards)`);
                    } else if (update.type === 'complete' || update.type === 'final') {
                        const data = update.course;
                        const quizzes = update.quizzes || [];
                        setCourseTitle(data.title);
                        setCourseDescription(data.description);
                        const mappedLessons: CourseLessonForm[] = data.lessons.map((lesson: NewLesson) => ({
                            title: lesson.title,
                            description: lesson.description,
                            content: lesson.content,
                            cardsToUnlock: lesson.cardsToUnlock,
                            quizIds: lesson.quizIds,
                        }));
                        setLessons(mappedLessons);
                        const quizIds = data.quizIds || [];
                        setCourseQuizIds(quizIds);
                        setCourseQuizzes(quizzes.map((quiz: {id: string, title: string}) => ({
                            id: quiz.id,
                            status: 'created' as const,
                            title: quiz.title
                        })));
                        setCollapsedLessons(mappedLessons.map(() => true));
                        const newCollapsedCards: { [lessonIndex: number]: boolean[] } = {};
                        mappedLessons.forEach((lesson: CourseLessonForm, index: number) => {
                            newCollapsedCards[index] = lesson.cardsToUnlock.map(() => true);
                        });
                        setCollapsedCards(newCollapsedCards);
                        onUpdate('Course generation complete!');
                    } else if (update.type === 'error') {
                        onUpdate(`Error: ${update.message}`);
                    }
                } catch (e) {
                    console.error('Failed to parse update:', jsonStr, e);
                    onUpdate(`Parsing error: ${jsonStr.substring(0, 50)}...`);
                }
            }
        } // end inner loop scanning for updates

        // If we processed something (pos > 0), drop processed prefix from buffer.
        // Otherwise (pos === 0) there were no complete updates; emit the whole buffer as a token
        // and clear it (this handles pure-token chunks with no interleaved JSON).
        if (pos > 0) {
            buffer = buffer.slice(pos);
        } else {
            // no update markers processed this iteration -> emit buffer as streaming text
            if (buffer.length > 0 && !done) {
                onUpdate(buffer);
                buffer = "";
            } else if (done) {
                // final flush: if buffer still contains text after done and no final message was found,
                // send it as tokens (the backend should have sent a final object, but be resilient)
                if (buffer.length > 0) {
                    onUpdate(buffer);
                    buffer = "";
                }
            }
        }

        if (done) break;
    }
}