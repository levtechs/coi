"use client";

import { useState } from "react";
import Button from "@/app/components/button";
import Loading from "@/app/components/loading";

interface FastCreatePopupProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    placeholder: string;
    onGenerate: (text: string, onUpdate: (message: string) => void) => Promise<void>;
    isGenerating: boolean;
}

export default function FastCreatePopup({
    isOpen,
    onClose,
    title,
    placeholder,
    onGenerate,
    isGenerating,
}: FastCreatePopupProps) {
    const [text, setText] = useState("");
    const [streamMessages, setStreamMessages] = useState<string[]>([]);
    const [isCompleted, setIsCompleted] = useState(false);
    const [hasError, setHasError] = useState(false);

    const handleGenerate = async () => {
        if (!text.trim()) return;
        setStreamMessages(['Initializing...']);
        setIsCompleted(false);
        setHasError(false);
        try {
            await onGenerate(text, (message) => {
                setStreamMessages(prev => [...prev, message]);
                if (message.includes('Error') || message.includes('error')) {
                    setHasError(true);
                }
            });
            setIsCompleted(true);
        } catch (error) {
            console.error('Generation error:', error);
            setHasError(true);
            setStreamMessages(prev => [...prev, 'An error occurred during generation.']);
        }
    };

    const handleClose = () => {
        setText("");
        setStreamMessages([]);
        setIsCompleted(false);
        setHasError(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>
                    {!isGenerating && (
                        <button
                            onClick={handleClose}
                            className="text-[var(--neutral-500)] hover:text-[var(--foreground)] text-2xl"
                        >
                            ×
                        </button>
                    )}
                </div>

                {isGenerating ? (
                    <div>
                        <Loading small={true} loadingText="Generating..." />
                        {streamMessages.length > 0 && (
                            <div className="mt-4 p-3 bg-[var(--neutral-100)] rounded-md max-h-48 overflow-y-auto">
                                <h3 className="font-semibold mb-2">Progress:</h3>
                                <ul className="space-y-1 text-sm">
                                    {streamMessages.map((msg, index) => (
                                        <li key={index} className={`${
                                            msg.includes('Error') || msg.includes('error') ? 'text-red-500' : 'text-[var(--foreground)]'
                                        }`}>{msg}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : isCompleted || hasError ? (
                    <div>
                        <div className={`p-3 rounded-md mb-4 ${
                            hasError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                            <h3 className="font-semibold">
                                {hasError ? 'Generation Failed' : 'Generation Completed'}
                            </h3>
                            <p className="text-sm mt-1">
                                {hasError ? 'An error occurred during course generation.' : 'Your course has been generated successfully.'}
                            </p>
                        </div>
                        {streamMessages.length > 0 && (
                            <div className="p-3 bg-[var(--neutral-100)] rounded-md max-h-48 overflow-y-auto">
                                <h3 className="font-semibold mb-2">Details:</h3>
                                <ul className="space-y-1 text-sm">
                                    {streamMessages.map((msg, index) => (
                                        <li key={index} className={`${
                                            msg.includes('Error') || msg.includes('error') ? 'text-red-500' : 'text-[var(--foreground)]'
                                        }`}>{msg}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Button color="var(--accent-500)" onClick={handleClose}>
                                Close
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-48 resize-y"
                            placeholder={placeholder}
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <Button color="var(--neutral-400)" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                color="var(--accent-500)"
                                onClick={handleGenerate}
                                disabled={!text.trim()}
                            >
                                Generate
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
