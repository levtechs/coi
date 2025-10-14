import { apiFetch } from "./helpers";

import { CourseLesson, Project } from "@/lib/types";

export async function getLesson(courseId: string, lessonIdx: number): Promise<{ lesson: CourseLesson; projectIds: string[] } | null> {
    try {
        const data = await apiFetch<{ lesson: CourseLesson; projectIds: string[] }>(`/api/courses/${courseId}/${lessonIdx}`, {
            method: "GET",
        });
        return data;
    } catch (err) {
        console.error("Error fetching lesson:", err);
        return null;
    }
}

/**
 * Creates a new project based on a lesson's content.
 * The lesson's title becomes the project title, and the lesson description
 * becomes the initial content in the project's hierarchy.
 *
 * @param courseId - The ID of the course containing the lesson
 * @param lessonIdx - The index of the lesson to convert to a project
 * @returns The created project object, or null if creation fails
 */
export async function takeLesson(courseId: string, lessonIdx: number): Promise<Project | null> {
    try {
        const data = await apiFetch<Project>(`/api/courses/${courseId}/${lessonIdx}`, {
            method: "POST",
        });
        return data;
    } catch (err) {
        console.error("Error taking lesson:", err);
        return null;
    }
}