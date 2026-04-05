import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES } from '@/lib/courseResourceLimits';
import { FileAttachment } from "@/lib/types/uploads";
import { CourseResource } from '@/lib/types/course';
import { apiFetch } from './helpers';

function isMarkdownLikeFile(file: File): boolean {
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith('.md') || lowerName.endsWith('.txt') || file.type === 'text/markdown' || file.type === 'text/plain';
}

async function uploadBlobToStorage(file: File, folder: string): Promise<{ url: string; storagePath: string }> {
    const storagePath = `${folder}/${crypto.randomUUID()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { url, storagePath };
}

export async function uploadFile(file: File, projectId: string): Promise<FileAttachment> {
    const { url } = await uploadBlobToStorage(file, 'uploads');
    const attachment: Omit<FileAttachment, 'id'> = {
        type: 'file',
        name: file.name,
        url,
        size: file.size,
        mimeType: file.type,
    };
    
    const saved = await apiFetch<FileAttachment[]>(`/api/projects/${projectId}/uploads`, {
        method: 'POST',
        body: JSON.stringify({ uploads: [attachment] }),
    });
    
    return saved[0];
}

export async function uploadFileToStorageOnly(file: File): Promise<FileAttachment> {
    const { url } = await uploadBlobToStorage(file, 'uploads');
    return {
        id: crypto.randomUUID(), // temporary ID for frontend state
        type: 'file',
        name: file.name,
        url,
        size: file.size,
        mimeType: file.type,
    };
}

function inferCourseResourceKind(file: File): CourseResource['kind'] {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (isMarkdownLikeFile(file)) return 'markdown';
    return 'link';
}

export async function uploadCourseResourceFile(
    file: File, 
    folder = 'course-resources',
    overrides?: Partial<CourseResource>
): Promise<CourseResource> {
    const isMarkdown = isMarkdownLikeFile(file);
    if (isMarkdown && file.size > MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES + 65_536) {
        throw new Error(
            `This file is too large to use as tutor reference text (max about ${Math.round(MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES / 1024)} KB of UTF-8 text).`,
        );
    }

    const { url, storagePath } = await uploadBlobToStorage(file, folder);
    let maybeText: string | undefined;
    if (isMarkdown) {
        const text = await file.text();
        const utf8Bytes = new TextEncoder().encode(text).length;
        if (utf8Bytes > MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES) {
            throw new Error(
                `Reference text is ${utf8Bytes} UTF-8 bytes; maximum is ${MAX_COURSE_RESOURCE_REFERENCE_UTF8_BYTES} bytes.`,
            );
        }
        maybeText = text;
    }
    const resourceKind = inferCourseResourceKind(file);

    return {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, ''),
        url,
        kind: resourceKind,
        mimeType: file.type || 'application/octet-stream',
        sourceFileName: file.name,
        size: file.size,
        storagePath,
        referenceText: maybeText,
        includeInTutorReference: resourceKind === 'markdown',
        studentVisible: resourceKind !== 'markdown',
        caption: '',
        ...overrides,
    };
}
