import { adminDb } from "@/lib/firebaseAdmin";
import { FileAttachment } from "@/lib/types/uploads";

export const fetchUploadsFromProject = async (projectId: string): Promise<FileAttachment[]> => {
    try {
        const projectRef = adminDb.collection("projects").doc(projectId);
        const projectSnap = await projectRef.get();

        if (!projectSnap.exists) {
            throw new Error("Project not found");
        }

        // Reference the 'uploads' subcollection within the project document.
        const uploadsCollectionRef = projectRef.collection("uploads");

        // Fetch all documents from the subcollection.
        const querySnapshot = await uploadsCollectionRef.get();

        // Map the Firestore documents to the FileAttachment interface.
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
        const uploadsCollectionRef = adminDb.collection("projects").doc(projectId).collection("uploads");

        const addedUploads = await Promise.all(newUploads.map(async (upload) => {
            const docRef = await uploadsCollectionRef.add(upload);
            return {
                id: docRef.id,
                ...upload,
            };
        }));

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
        const uploadsCollectionRef = adminDb.collection("projects").doc(projectId).collection("uploads");

        const batch = adminDb.batch();
        for (const upload of uploads) {
            if (!upload.id) continue;
            const docRef = uploadsCollectionRef.doc(upload.id);
            batch.set(docRef, upload);
        }
        await batch.commit();

        return uploads;
    } catch (err) {
        console.error("copyUploadsToDb: Error copying uploads to Firestore:", err);
        throw err;
    }
};
