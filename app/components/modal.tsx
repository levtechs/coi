"use client";

import React, { useState, useEffect, ReactNode } from "react";
import Button from "@/app/components/button";

type ProjectModalProps = {
    isOpen: boolean;
    initialValue?: string;
    onClose: () => void;
    onSubmit: (value: string) => void;
    title?: string;
    placeholder?: string;
};

export default function Modal({
    isOpen,
    initialValue = "",
    onClose,
    onSubmit,
    title = "Project",
    placeholder = "Enter project title"
}: ProjectModalProps) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    if (!isOpen) return null;

    return (
        <div className="relative bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-80 flex flex-col gap-4 z-10">
            <h2 className="text-[var(--foreground)] font-semibold text-xl">
                {title}
            </h2>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!value.trim()) return;
                    onSubmit(value.trim());
                    setValue(initialValue);
                }}
                className="flex flex-col gap-4"
            >
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="border border-[var(--neutral-300)] rounded-md p-2 bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] transition"
                    placeholder={placeholder}
                    autoFocus
                />

                <div className="flex justify-end gap-2">
                    <Button
                        color="var(--neutral-300)"
                        type="button"
                        onClick={() => {
                            onClose();
                            setValue(initialValue);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button color="var(--accent-500)" type="submit">
                        Save
                    </Button>
                </div>
            </form>
        </div>
    );
}
