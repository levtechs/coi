import { apiFetch } from "./helpers";

import { Course, CourseLesson, NewCard, Project } from "@/lib/types";

type NewCourse = Omit<Course, "id" | "lessons"> & { lessons: NewLesson[] };
type NewLesson = Omit<CourseLesson, "id" | "courseId" | "cardsToUnlock"> & { cardsToUnlock: NewCard[] };

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
        const data = await apiFetch<{ totalUsers: number; invitations: { token: string; createdAt: string; acceptedBy: { id: string; email: string; displayName: string; actions?: number; dailyActions?: number; weeklyActions?: number; projectIds?: string[]; }[]; }[]; }>(`/api/courses/${courseId}/analytics`, {
            method: "GET",
        });
        return data;
    } catch (err) {
        console.error("Error fetching analytics:", err);
        return null;
    }
}