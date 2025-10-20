import { db } from "@/lib/firebase";
import { Project } from "@/lib/types";
import { doc, getDoc, collection, updateDoc, addDoc } from "firebase/firestore";

/**
 * Fetches a single project by ID, checking user access.
 *
 * @param projectId - The project ID
 * @param uid - The user ID for access check
 * @returns The project or null if not found or access denied
 */
export async function getProjectById(projectId: string, uid: string): Promise<Project | null> {
    try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) return null;

        const data = snap.data();
        if (data.ownerId !== uid && !(data.sharedWith ?? []).includes(uid)) {
            return null; // Access denied
        }

        return { id: projectId, ...data } as Project;
    } catch (err) {
        console.error("Error fetching project by ID:", err);
        throw new Error("Failed to fetch project");
    }
}

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
        // Exclude cards from document data, as cards are stored in subcollection
        const { cards, ...docData } = projectData;

        // 1️⃣ Create the new project document
        const projectsCol = collection(db, "projects");
        const docRef = await addDoc(projectsCol, {
            ...docData,
            ownerId: uid,
            collaborators: [],
            sharedWith: [],
        });

        // 2️⃣ Write cards to subcollection if provided
        if (cards && cards.length > 0) {
            const { writeCardsToDb } = await import("../cards/helpers");
            await writeCardsToDb(docRef.id, cards);
        }

        // 3️⃣ Add the projectId to the user's projectIds array
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