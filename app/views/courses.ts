import { apiFetch } from "./helpers";

import { Course, CourseLesson } from "@/lib/types";

type NewCourse = Omit<Course, "id"> & { lessons: NewLesson[] };
type NewLesson = Omit<CourseLesson, "id" | "courseId">;

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

export async function getCourse(courseId: string): Promise<Course | null> {
    try {
        const data = await apiFetch<Course>(`/api/courses/${courseId}`, {
            method: "GET",
        });
        if (data) data.id = courseId;
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