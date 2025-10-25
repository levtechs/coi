"use client";

import { useState } from "react";
import Button from "@/app/components/button";
import { upgradeToStar } from "@/app/views/star";

interface StarModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function StarModal({ isOpen, onClose }: StarModalProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const result = await upgradeToStar(code);
            if ('error' in result) {
                setError(result.error);
            } else {
                onClose();
                alert("Successfully upgraded to star user!");
            }
        } catch (err) {
            const msg = (err as Error).message;
            if (msg.includes("400")) {
                setError("Invalid code");
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
            <div className="bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-96 flex flex-col gap-4">
                <h2 className="text-[var(--foreground)] font-semibold text-xl">Enter code to become star user</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="border border-[var(--neutral-300)] rounded-md p-2 bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] transition"
                        placeholder="Enter code"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <Button
                            color="var(--neutral-300)"
                            type="button"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button color="var(--accent-500)" type="submit" disabled={loading}>
                            {loading ? "Submitting..." : "Submit"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}