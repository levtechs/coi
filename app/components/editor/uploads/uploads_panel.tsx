import React, { useRef, useState, useEffect } from 'react';
import { FileAttachment, ChatAttachment } from '@/lib/types';
import { FiEye, FiPlus, FiUpload } from 'react-icons/fi';
import { uploadFile } from '@/app/views/uploads';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/uploadConstants';
import { collection, onSnapshot, CollectionReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const UploadsPanel = ({ addFileAttachment, projectId }: { addFileAttachment?: (attachment: ChatAttachment) => void, projectId: string }) => {
    const [uploads, setUploads] = useState<FileAttachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const uploadsRef: CollectionReference<FileAttachment> = collection(db, "projects", projectId, "uploads") as CollectionReference<FileAttachment>;
        const unsubscribe = onSnapshot(
            uploadsRef,
            (querySnap) => {
                const newUploads: FileAttachment[] = querySnap.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id,
                }));
                setUploads(newUploads);
            },
            (err) => console.error("Error fetching uploads:", err)
        );
        return unsubscribe;
    }, [projectId]);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_MIME_TYPES.some(type => file.type.startsWith(type))) {
            alert(`File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
            return;
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            alert(`File size exceeds the limit of ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)} MB`);
            return;
        }

        try {
            await uploadFile(file, projectId);
            // The uploads will be updated via real-time listener
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        }

        // Reset the input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Project Uploads</h2>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-[var(--accent-500)] text-white rounded-md hover:bg-[var(--accent-600)] transition-colors flex items-center gap-2"
                >
                    <FiUpload size={16} />
                    Upload File
                </button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept={ALLOWED_MIME_TYPES.join(',')}
                className="hidden"
            />
            {uploads.length === 0 ? (
                <p className="text-[var(--neutral-500)]">No uploads yet.</p>
            ) : (
                <div className="space-y-2">
                    {uploads.map((upload) => (
                        <div key={upload.id} className="flex items-center justify-between p-3 bg-[var(--neutral-100)] rounded-md">
                            <div className="flex items-center gap-3 flex-1">
                                {upload.mimeType.startsWith('image/') && (
                                    <img
                                        src={upload.url}
                                        alt={upload.name}
                                        className="w-12 h-12 object-cover rounded"
                                    />
                                )}
                                <div>
                                    <p className="font-medium text-[var(--foreground)]">{upload.name}</p>
                                    <p className="text-sm text-[var(--neutral-500)]">
                                        {formatSize(upload.size)} • {upload.mimeType}
                                    </p>
                                </div>
                            </div>
                             <div className="flex gap-2">
                                 <button
                                     onClick={() => window.open(upload.url, '_blank')}
                                     className="p-2 bg-[var(--neutral-200)] text-[var(--foreground)] rounded-md hover:bg-[var(--neutral-300)] transition-colors"
                                     title="Download"
                                 >
                                     <FiEye size={16} />
                                 </button>
                                 <button
                                     onClick={() => addFileAttachment?.(upload)}
                                     className="p-2 bg-[var(--accent-500)] text-white rounded-md hover:bg-[var(--accent-600)] transition-colors"
                                     title="Add to chat"
                                 >
                                     <FiPlus size={16} />
                                 </button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UploadsPanel;