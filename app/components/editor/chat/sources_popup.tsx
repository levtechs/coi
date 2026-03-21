"use client";

import { GroundingSources } from "@/lib/types/chat";
import { FiExternalLink, FiX } from "react-icons/fi";

interface SourcesPopupProps {
    sources: GroundingSources;
    onClose: () => void;
}

const SourcesPopup = ({ sources, onClose }: SourcesPopupProps) => {
    return (
        <div className="flex flex-col gap-6 w-full max-h-[70vh] bg-[var(--neutral-100)] rounded-xl p-8 overflow-hidden shadow-xl text-left relative">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-[var(--neutral-600)] hover:text-[var(--neutral-900)] transition-colors rounded-full hover:bg-[var(--neutral-200)]"
            >
                <FiX className="w-5 h-5" />
            </button>

            <div>
                <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Sources</h2>
                <p className="text-sm text-[var(--neutral-600)] mt-1">External references found by search but not turned into cards.</p>
            </div>

            <div className="overflow-y-auto pr-2 pb-2 flex-1">
                <div className="flex flex-col gap-3">
                    {sources.chunks.map((chunk, index) => (
                        <a
                            key={`${chunk.web.uri}-${index}`}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col gap-1 p-4 rounded-xl border border-[var(--neutral-300)] bg-[var(--neutral-100)] hover:bg-[var(--neutral-200)] hover:border-[var(--accent-300)] hover:shadow-sm transition-all"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent-600)] transition-colors">
                                    {chunk.web.title}
                                </span>
                                <FiExternalLink className="w-4 h-4 text-[var(--neutral-400)] group-hover:text-[var(--accent-500)] transition-colors shrink-0" />
                            </div>
                            <span className="text-xs text-[var(--neutral-500)] break-all">{chunk.web.uri}</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SourcesPopup;
