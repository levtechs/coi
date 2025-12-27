import {
    collection,
    getDocs,
    doc,
    addDoc,
    writeBatch,
    getDoc,
    setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileAttachment } from "@/lib/types";

export const fetchUploadsFromProject = async (projectId: string): Promise<FileAttachment[]> => {
    try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            throw new Error("Project not found");
        }

        // Reference the 'uploads' subcollection within the project document.
        const uploadsCollectionRef = collection(db, "projects", projectId, "uploads");

        // Fetch all documents from the subcollection.
        const querySnapshot = await getDocs(uploadsCollectionRef);

        // Map the Firestore documents to the FileAttachment interface.
        // It is critical to include the document's id in the returned object.
        const uploads: FileAttachment[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<FileAttachment, 'id'>
        }));

        // Return the list of uploads.
        return uploads;

    } catch (err) {
        console.error("Error fetching uploads:", err);
        throw err;
    }
};

/**
 * Writes a list of uploads (without IDs) into Firestore and returns
 * only the newly added uploads (with generated IDs).
 *
 * @param projectId - The ID of the project where uploads will be stored.
 * @param newUploads - Array of uploads without IDs to write to Firestore.
 * @returns A promise resolving to the list of newly added uploads with Firestore IDs.
 */
export const writeUploadsToDb = async (
    projectId: string,
    newUploads: Omit<FileAttachment, 'id'>[]
): Promise<FileAttachment[]> => {
    try {
        const uploadsCollectionRef = collection(db, "projects", projectId, "uploads");

        const addedUploads: FileAttachment[] = [];

        for (const upload of newUploads) {
            const docRef = await addDoc(uploadsCollectionRef, upload);
            addedUploads.push({
                id: docRef.id,
                ...upload,
            });
        }

        return addedUploads;
    } catch (err) {
        console.error("Error writing uploads to Firestore:", err);
        throw err;
    }
};

/**
 * Copies a list of uploads (with IDs) into Firestore, preserving their IDs.
 *
 * @param projectId - The ID of the project where uploads will be stored.
 * @param uploads - Array of uploads with IDs to copy to Firestore.
 * @returns A promise resolving to the list of copied uploads (same as input).
 */
export const copyUploadsToDb = async (
    projectId: string,
    uploads: FileAttachment[]
): Promise<FileAttachment[]> => {
    try {
        const uploadsCollectionRef = collection(db, "projects", projectId, "uploads");

        for (const upload of uploads) {
            const docRef = doc(uploadsCollectionRef, upload.id);
            await setDoc(docRef, upload);
        }

        return uploads;
    } catch (err) {
        console.error("copyUploadsToDb: Error copying uploads to Firestore:", err);
        throw err;
    }
};