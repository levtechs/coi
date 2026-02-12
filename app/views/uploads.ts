import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { FileAttachment } from '@/lib/types';
import { writeUploadsToDb } from '@/app/api/uploads/helpers';

export async function uploadFile(file: File, projectId: string): Promise<FileAttachment> {
    const storageRef = ref(storage, `uploads/${crypto.randomUUID()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    const attachment: Omit<FileAttachment, 'id'> = {
        type: 'file',
        name: file.name,
        url,
        size: file.size,
        mimeType: file.type,
    };
    const saved = await writeUploadsToDb(projectId, [attachment]);
    return saved[0];
}

export async function uploadFileToStorageOnly(file: File): Promise<FileAttachment> {
    const storageRef = ref(storage, `uploads/${crypto.randomUUID()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return {
        id: crypto.randomUUID(), // temporary ID for frontend state
        type: 'file',
        name: file.name,
        url,
        size: file.size,
        mimeType: file.type,
    };
}