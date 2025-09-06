import { Project } from "@/lib/types";
import { apiFetch } from "./helpers";

import { getCards } from "./cards";

/** Fetch all projects for current user */
export async function getProjects(): Promise<Project[]> {
    const data = await apiFetch<{ projects: Project[] }>("/api/projects");
    return data.projects;
}

/** Create a new project */
export async function createProject(title: string): Promise<void> {
    await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({ title }),
    });
}

/** Save / update a project */
export async function saveProject(project: Project): Promise<void> {
    await apiFetch(`/api/projects/${project.id}`, {
        method: "POST",
        body: JSON.stringify(project),
    });
}

/**
 * Fetches the complete project object, including the cards.
 * @param projectId The ID of the project to fetch.
 * @returns A promise that resolves to the complete Project object.
 */
export async function getProject(projectId: string): Promise<Project> {
    try {
        // Step 1: Fetch the main project document.
        const project = await apiFetch<Project>(`/api/projects/${projectId}`);

        // Step 2: Fetch the cards from the subcollection using the getCards function.
        const cards = await getCards(projectId);

        // Step 3: Combine the project data and cards into a single object.
        const completeProject: Project = {
            ...project,
            cards: cards,
        };

        return completeProject;
    } catch (err) {
        console.error("Error fetching project or cards:", err);
        throw err;
    }
}

/**
 * Deletes a project by its ID.
 * @param projectId The ID of the project to delete.
 * @returns A promise that resolves when the project is successfully deleted.
 */
export async function deleteProject(projectId: string): Promise<void> {
    try {
        await apiFetch(`/api/projects/${projectId}`, {
            method: "DELETE",
        });
        console.log(`Project with ID ${projectId} successfully deleted.`);
    } catch (error) {
        console.error("Failed to delete project:", error);
        throw error;
    }
}

/** Fetch owner */
export async function getOwnerId(projectId: string): Promise<string> {
    const project = await apiFetch<Project>(`/api/projects/${projectId}`);
    return project.ownerId;
}

/** Fetch collaborators */
export async function getCollaborators(projectId: string): Promise<string[]> {
    const project = await apiFetch<Project>(`/api/projects/${projectId}`);
    return project.collaborators;
}

/** Add collaborator to project */
export async function addCollaborator(projectId: string, email: string): Promise<void> {
    await apiFetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

/** Remove collaborator from project */
export async function removeCollaborator(projectId: string, email: string): Promise<void> {
    await apiFetch(`/api/projects/${projectId}/share`, {
        method: "DELETE",
        body: JSON.stringify({ email }),
    });
}

/** Fetch project title */
export async function getTitle(projectId: string): Promise<string> {
    const project = await apiFetch<Project>(`/api/projects/${projectId}`);
    return project.title;
}

/** Fetch project content */
export async function getContent(projectId: string): Promise<JSON> {
    const project = await apiFetch<Project>(`/api/projects/${projectId}`);
    return project.content;
}

/** Update project title */
export async function setTitle(projectId: string, title: string): Promise<void> {
    await apiFetch(`/api/projects/${projectId}`, {
        method: "POST",
        body: JSON.stringify({ title }),
    });
}

/** Update project content */
export async function setContent(projectId: string, content: string): Promise<void> {
    await apiFetch(`/api/projects/${projectId}`, {
        method: "POST",
        body: JSON.stringify({ content }),
    });
}
