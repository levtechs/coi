import React from 'react';
import { FileAttachment } from '@/lib/types';

const UploadsPanel = ({ uploads }: { uploads: FileAttachment[] }) => {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Project Uploads</h2>
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
                            <a
                                href={upload.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-[var(--accent-500)] text-white rounded-md hover:bg-[var(--accent-600)] transition-colors"
                            >
                                Download
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UploadsPanel;