"use client";

import React, { useState } from "react";

import { FiX, FiPlus, FiTrash2, FiCheck} from "react-icons/fi";
import Button from "../../button";


type NewCardPopupProps = {
    onCancel: () => void;
    onSubmit: (title: string, details: string[], exclude: boolean) => void;
};

export default function NewCardPopup({ onSubmit, onCancel }: NewCardPopupProps) {
    const [title, setTitle] = useState("");
    const [details, setDetails] = useState<string[]>([""]);
    const [exclude, setExclude] = useState(true);

    const handleDetailChange = (index: number, value: string) => {
        const newDetails = [...details];
        newDetails[index] = value;
        setDetails(newDetails);
    };

    const handleAddDetail = () => {
        setDetails([...details, ""]);
    };

    const handleRemoveDetail = (index: number) => {
        setDetails(details.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        if (!title.trim()) return; // require title
        onSubmit(title, details, exclude);
        onCancel();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50"
            onClick={onCancel}
        >
            <div
                className="relative bg-[var(--neutral-100)] p-8 rounded-lg shadow-lg w-full max-w-2xl mx-4 sm:mx-0 flex flex-col gap-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    className="absolute top-4 right-4 text-[var(--neutral-400)] hover:text-[var(--neutral-700)]"
                    onClick={onCancel}
                >
                    <FiX size={20} />
                </button>

                {/* Title input */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[var(--neutral-400)]">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-md border border-[var(--neutral-400)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent-400)]"
                        placeholder="Enter card title"
                    />
                </div>

                {/* Details list */}
                <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-[var(--neutral-400)]">Details</label>
                    {details.map((detail, i) => (
                        <div key={i} className="flex gap-2 items-start">
                            <textarea
                                value={detail}
                                onChange={(e) => handleDetailChange(i, e.target.value)}
                                className="flex-1 rounded-md border border-[var(--neutral-400)] px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-[var(--accent-400)]"
                                placeholder={`Detail ${i + 1}`}
                            />
                            {details.length > 1 && (
                                <FiTrash2
                                    className="text-[var(--neutral-400)] hover:text-[var(--error)]"
                                    onClick={() => handleRemoveDetail(i)}
                                    size={18} 
                                />
                            )}
                        </div>
                    ))}
                    {(details.length < 6) && (
                        <button
                            type="button"
                            onClick={handleAddDetail}
                            className="flex items-center gap-2 text-[var(--accent-500)] hover:text-[var(--accent-600)] text-sm font-medium"
                        >
                            <FiPlus size={16} /> Add detail
                        </button>         
                    )}
                </div>

                <h2 className="mt-4">
                    Options:
                </h2>
                <div className="flex items-center gap-4">
                    <label className="relative flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={exclude}
                            onChange={(e) => setExclude(e.target.checked)}
                            className="peer sr-only"
                        />
                        <div className="w-6 h-6 rounded-md border border-[var(--neutral-300)] bg-[var(--neutral-100)] flex items-center justify-center transition-all duration-200 peer-checked:bg-[var(--accent-500)] peer-checked:border-[var(--accent-500)]">
                            <FiCheck
                                className="text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                            />
                        </div>
                    </label>
                    <label htmlFor="longLived" className="text-[var(--foreground)] text-lg cursor-pointer" onClick={() => setExclude(!exclude)}>
                        Exclude from hierarchy
                    </label>
                </div>


                {/* Action buttons */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        onClick={onCancel}
                        color="var(--error)"
                    >
                        Discard changes
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        color="var(--accent-400)"
                    >
                        Save card
                    </Button>
                </div>
            </div>
        </div>
    );
}
