"use client";

import React, { useState, useEffect } from "react";
import Button from "@/app/components/button";

type ProjectModalProps = {
    isOpen: boolean;
    type: "input" | "confirm" | "info" | "error";
    message?: string;
    initialValue?: string;
    onClose: () => void;
    onSubmit?: (value: string) => void;
    onProceed?: () => void;
    title?: string;
    placeholder?: string;
};

export default function Modal({
    isOpen,
    type,
    message = "",
    initialValue = "",
    onClose,
    onSubmit,
    onProceed,
    title = "Project",
    placeholder = "Enter project title"
}: ProjectModalProps) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    if (!isOpen) return null;

    return (
        // This is the new full-screen overlay container
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
            {/* This is your existing modal content */}
            <div className="bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-80 flex flex-col gap-4">
                <h2 className="text-[var(--foreground)] font-semibold text-xl">
                    {title}
                </h2>

                {(!type || type === "input") ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!value.trim()) return;
                            onSubmit?.(value.trim());
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
                ) : (
                    <>
                        <p className={`text-[var(${(type === "error") ? "--error" : "--foreground"})]`}>
                            {message}
                        </p>
                        <div className="flex flex-row w-[100%] gap-4">
                            <Button
                                className="flex-1"
                                color="var(--neutral-300)"
                                type="button"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                color="var(--accent-300)"
                                type="button"
                                onClick={onProceed ? onProceed : () => {}}
                            >
                                {type === "confirm" ? "Ok" : "close"}
                            </Button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
