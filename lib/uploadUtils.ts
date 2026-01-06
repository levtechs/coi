import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB, MAX_FILES } from './uploadConstants';
import { ChatAttachment } from './types';

export interface UploadOptions {
    projectId: string;
    onError?: (message: string) => void;
    onFileError?: (file: File, message: string) => void;
    onSuccess?: (attachment: ChatAttachment) => void;
}

export async function validateAndUploadFiles(files: File[], options: UploadOptions): Promise<void> {
    const { projectId, onError, onFileError, onSuccess } = options;

    if (files.length > MAX_FILES) {
        onError?.(`Too many files. Maximum ${MAX_FILES} files allowed.`);
        return;
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
        onError?.(`Total file size exceeds the limit of ${MAX_UPLOAD_SIZE_MB} MB`);
        return;
    }

    const uploadTasks = files.map(async (file) => {
        if (!ALLOWED_MIME_TYPES.some(type => file.type.startsWith(type))) {
            onFileError?.(file, `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
            return;
        }
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            onFileError?.(file, `File size exceeds the limit of ${MAX_UPLOAD_SIZE_MB} MB`);
            return;
        }
        try {
            const { uploadFile } = await import('@/app/views/uploads');
            const attachment = await uploadFile(file, projectId);
            onSuccess?.(attachment);
        } catch (error) {
            console.error('Upload failed:', error);
            onFileError?.(file, 'Upload failed. Please try again.');
        }
    });

    await Promise.all(uploadTasks);
}