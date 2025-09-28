import { Project, User } from "@/lib/types";
import { auth } from "@/lib/firebase";

/**
 * Get initial admin details including 10 projects and 10 users.
 * @returns An object containing arrays of projects and users.
 */
export async function getAdminDetails(): Promise<{ projects: Project[]; users: User[] }> {
    try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("No auth token");
        const response = await fetch("/api/admin", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error("Unauthorized");
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Error fetching admin details:", err);
        throw err;
    }
}

/**
 * Get more projects for admin.
 * @param lastId The ID of the last project.
 * @returns An array of more projects.
 */
export async function getMoreProjects(lastId: string): Promise<Project[]> {
    try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("No auth token");
        const response = await fetch(`/api/admin/projects?limit=10&lastId=${lastId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error("Unauthorized");
        const data = await response.json();
        return data.projects;
    } catch (err) {
        console.error("Error fetching more projects:", err);
        throw err;
    }
}

/**
 * Get more users for admin.
 * @param lastId The ID of the last user.
 * @returns An array of more users.
 */
export async function getMoreUsers(lastId: string): Promise<User[]> {
    try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("No auth token");
        const response = await fetch(`/api/admin/users?limit=10&lastId=${lastId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error("Unauthorized");
        const data = await response.json();
        return data.users;
    } catch (err) {
        console.error("Error fetching more users:", err);
        throw err;
    }
}

/**
 * Get projects for a specific user.
 * @param userId The user ID.
 * @returns An array of projects.
 */
export async function getProjectsForUser(userId: string): Promise<Project[]> {
    try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("No auth token");
        const response = await fetch(`/api/admin/user-projects?userId=${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error("Unauthorized");
        const data = await response.json();
        return data.projects;
    } catch (err) {
        console.error("Error fetching projects for user:", err);
        throw err;
    }
}