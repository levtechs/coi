"use client";

import React, { useState, useEffect } from "react";
import Button from "@/app/components/button";

type ProjectModalProps = {
    visible: boolean;
    initialValue?: string;
    onCancel: () => void;
    onSubmit: (value: string) => void;
    title?: string;
};

export default function ProjectModal({
    visible,
    initialValue = "",
    onCancel,
    onSubmit,
    title = "Project",
}: ProjectModalProps) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Semi-transparent blurred overlay */}
            <div
                className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
                onClick={onCancel}
            ></div>

            {/* Modal content (keep your original styling) */}
            <div className="relative bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-80 flex flex-col gap-4 z-10">
                <h2 className="text-[var(--foreground)] font-semibold text-xl">
                    {title}
                </h2>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="border border-[var(--neutral-300)] rounded-md p-2 bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] transition"
                    placeholder="Project Name"
                />
                <div className="flex justify-end gap-2">
                    <Button color="var(--neutral-300)" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button color="var(--accent-500)" onClick={() => onSubmit(value)}>
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}
