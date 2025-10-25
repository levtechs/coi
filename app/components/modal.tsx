"use client";

import React, { useState, useEffect, ReactNode } from "react";
import Button from "@/app/components/button";
import LoadingComponent from "./loading";

type ProjectModalProps = {
    isOpen: boolean;
    type: "input" | "confirm" | "info" | "error" | "empty";
    width?: string,
    message?: string;
    initialValue?: string;
    onClose: () => void;
    onSubmit?: (value: string) => void;
    onProceed?: () => void;
    title?: string;
    placeholder?: string;
    children?: ReactNode;
};

export default function Modal({
    isOpen,
    type,
    width="md",
    message = "",
    initialValue = "",
    onClose,
    onSubmit,
    onProceed,
    title,
    placeholder = "Enter project title",
    children
}: ProjectModalProps) {
    const [value, setValue] = useState(initialValue);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    if (!isOpen) return null;

    return (
        // This is the new full-screen overlay container
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
            {/* This is your existing modal content */}
            <div className={`bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-${width ?? "80"} flex flex-col gap-4`}>
                {title && <h2 className="text-[var(--foreground)] font-semibold text-xl">{title}</h2>}

                {(!type || type === "input") ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!value.trim()) return;
                            
                            const asyncOnSubmit = async (value: string) => {
                                setIsLoading(true);
                                await onSubmit?.(value.trim());
                                setValue(initialValue);
                                setIsLoading(false);
                                onClose();
                            } 
                            
                            asyncOnSubmit(value);
                        }}
                        className="flex flex-col gap-4"
                    >
                        {isLoading ? (
                            <LoadingComponent loadingText="Submitting" small={true}/>
                        ) : (
                            <>
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
                                            setValue(initialValue);
                                            onClose();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button color="var(--accent-500)" type="submit">
                                        Save
                                    </Button>
                                </div>
                            </>
                        )}
                    </form>
                ) : (
                    <>
                        {message && (<p className={type === "error" ? "text-[var(--error)]" : "text-[var(--foreground)]"}>{message}</p>)}
                        {type === "info" ? (
                            <div className="flex flex-col">
                                {children}
                                <div className="flex flex-row w-[100%] gap-4">
                                    <Button
                                        className="flex-1"
                                        color="var(--accent-300)"
                                        type="button"
                                        onClick={onClose}
                                    >
                                        close
                                    </Button>
                                </div>
                            </div>
                        ) : type === "empty" ? (
                            <div className="flex flex-col">
                                {children}
                                <div className="flex flex-row w-[100%] gap-4 mt-4">
                                    <Button
                                        className="flex-1"
                                        color="var(--neutral-300)"
                                        type="button"
                                        onClick={onClose}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>

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

                    </>
                )}

            </div>
        </div>
    );
}
