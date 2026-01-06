import React, { useRef, useState, useEffect } from 'react';
import { FileAttachment, ChatAttachment } from '@/lib/types';
import { FiEye, FiPlus, FiUpload } from 'react-icons/fi';
import { uploadFile } from '@/app/views/uploads';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/uploadConstants';
import { validateAndUploadFiles } from '@/lib/uploadUtils';
import { collection, onSnapshot, CollectionReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const UploadsPanel = ({ addFileAttachment, projectId }: { addFileAttachment?: (attachment: ChatAttachment) => void, projectId: string }) => {
    const [uploads, setUploads] = useState<FileAttachment[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
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

    const acceptTypes = ALLOWED_MIME_TYPES.map(type => type.endsWith('/') ? type + '*' : type).join(',');

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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (_: React.DragEvent) => {
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        await validateAndUploadFiles(files, {
            projectId,
            onError: alert,
            onFileError: (_, message) => alert(message),
        });
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file && ALLOWED_MIME_TYPES.some(type => file.type.startsWith(type))) {
                    files.push(file);
                }
            }
        }
        if (files.length === 0) return;
        e.preventDefault();
        await validateAndUploadFiles(files, {
            projectId,
            onError: (message) => { alert(message); },
            onFileError: (_, message) => alert(message),
        });
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
                accept={acceptTypes}
                className="hidden"
            />
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onPaste={handlePaste}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
                className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors mb-4 ${isDragOver ? 'border-[var(--accent-500)] bg-[var(--accent-100)]' : 'border-[var(--neutral-300)]'}`}
            >
                <FiUpload size={48} className="mx-auto mb-4 text-[var(--neutral-500)]" />
                <p className="text-[var(--neutral-500)]">Drag and drop files here to upload</p>
                <p className="text-sm text-[var(--neutral-400)] mt-2">or paste from clipboard, or click to select files</p>
            </div>
            {uploads.length > 0 && (
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