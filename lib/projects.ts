// project.ts
import { db } from "./firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, QuerySnapshot, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export type Project = {
    id: string;
    title: string;
    collaborators: string[]; // list of emails
    content: string; // markdown content
};

/**
 * Subscribes to all projects for a given user.
 * Returns an unsubscribe function to stop listening.
 */
export function subscribeToProjects(uid: string, callback: (projects: Project[]) => void) {
    const projectsCol = collection(db, "users", uid, "projects");
    const unsubscribe = onSnapshot(projectsCol, (snapshot: QuerySnapshot) => {
        const projects = snapshot.docs.map(doc => {
            const data = doc.data() as Partial<Project>;
            return {
                id: doc.id,
                title: data.title || "Untitled Project",
                collaborators: data.collaborators || [],
                content: data.content || "",
            } as Project;
        });
        callback(projects);
    });
    return unsubscribe;
}


/**
 * Save a project (create or update)
 */
export async function saveProject(uid: string, project: Project) {
    const projectRef = doc(db, "users", uid, "projects", project.id);
    await setDoc(projectRef, {
        title: project.title,
        collaborators: project.collaborators,
        content: project.content,
    }, { merge: true });
}

/**
 * Delete a project
 */
export async function deleteProject(uid: string, projectId: string) {
    const projectRef = doc(db, "users", uid, "projects", projectId);
    await deleteDoc(projectRef);
}

/**
 * Add a collaborator to a project
 */
export async function addCollaborator(uid: string, projectId: string, email: string) {
    const projectRef = doc(db, "users", uid, "projects", projectId);
    await updateDoc(projectRef, {
        collaborators: arrayUnion(email),
    });
}

/**
 * Remove a collaborator from a project
 */
export async function removeCollaborator(uid: string, projectId: string, email: string) {
    const projectRef = doc(db, "users", uid, "projects", projectId);
    await updateDoc(projectRef, {
        collaborators: arrayRemove(email),
    });
}

/**
 * Get project title
 */
export async function getTitle(uid: string, projectId: string): Promise<string> {
    const projectRef = doc(db, "users", uid, "projects", projectId);
    const snapshot = await getDoc(projectRef);
    if (!snapshot.exists()) return "";
    const data = snapshot.data() as Project;
    return data.title || "";
}

/**
 * Get list of collaborators for a project
 */
export async function getCollaborators(uid: string, projectId: string): Promise<string[]> {
    const projectRef = doc(db, "users", uid, "projects", projectId);
    const snapshot = await getDoc(projectRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.data() as Project;
    return data.collaborators || [];
}

/**
 * Get project content
 */
export async function getContent(uid: string, projectId: string): Promise<string> {
    const projectRef = doc(db, "users", uid, "projects", projectId);
    const snapshot = await getDoc(projectRef);
    if (!snapshot.exists()) return "";
    const data = snapshot.data() as Project;
    return data.content || "";
}

/**
 * Set project title
 */
export async function setTitle(uid: string, projectId: string, title: string) {
    const projectRef = doc(db, "users", uid, "projects", projectId);
    await updateDoc(projectRef, { title });
}


/**
 * Set project content
 */
export async function setContent(uid: string, projectId: string, content: string) {
    const projectRef = doc(db, "users", uid, "projects", projectId);
    await updateDoc(projectRef, { content });
}
