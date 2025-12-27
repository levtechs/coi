import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FileAttachment } from '@/lib/types';
import { writeUploadsToDb } from '@/app/api/uploads/helpers';

export async function uploadFile(file: File, projectId: string): Promise<FileAttachment> {
    const storage = getStorage();
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