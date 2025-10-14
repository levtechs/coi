import { db } from "@/lib/firebase";
import { Project } from "@/lib/types";
import { doc, getDoc, collection, updateDoc, addDoc } from "firebase/firestore";

/**
 * Creates a new project in Firestore and adds it to the user's project list.
 *
 * @param projectData - The project data excluding id, ownerId, collaborators, and sharedWith
 * @param uid - The user ID of the project owner
 * @returns The ID of the created project
 * @throws Error if project creation fails
 */
export async function createProject(
    projectData: Omit<Project, 'id' | 'ownerId' | 'collaborators' | 'sharedWith'>,
    uid: string
): Promise<string> {
    try {
        // 1️⃣ Create the new project document
        const projectsCol = collection(db, "projects");
        const docRef = await addDoc(projectsCol, {
            ...projectData,
            ownerId: uid,
            collaborators: [],
            sharedWith: [],
        });

        // 2️⃣ Add the projectId to the user's projectIds array
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        const currentProjectIds = (userSnap.exists() ? userSnap.data().projectIds || [] : []);
        await updateDoc(userRef, { projectIds: [...currentProjectIds, docRef.id] });

        return docRef.id;
    } catch (err) {
        console.error("Error creating project:", err);
        throw new Error("Failed to create project");
    }
}