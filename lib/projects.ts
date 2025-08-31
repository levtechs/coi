import { auth } from "./firebase";

export type Project = {
    id: string;
    title: string;
    collaborators: string[]; // emails
    content: string; // markdown
};

// Helper: include current user ID in headers
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "x-user-id": user.uid,
            ...(options?.headers || {}),
        },
    });
    if (!res.ok) throw new Error(`API request failed: ${res.status}`);
    return res.json() as Promise<T>;
}

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

/** Delete a project (optional, not implemented in backend) */
export async function deleteProject(projectId: string): Promise<void> {
    throw new Error("Delete project not implemented yet");
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
export async function getContent(projectId: string): Promise<string> {
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
