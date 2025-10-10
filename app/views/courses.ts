import { apiFetch } from "./helpers";

import { Course } from "@/lib/types";

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