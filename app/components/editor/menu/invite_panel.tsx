import { useState } from "react";
import Button from "@/app/components/button";
import { Project } from "@/lib/types";
import { createInvitation } from "@/app/views/invite";
import { FiLink, FiCheck } from "react-icons/fi";

type InvitePanelProps = {
    project: Project;
    onClose: () => void;
};

export default function InvitePanel({ onClose, project }: InvitePanelProps) {
    const [token, setToken] = useState<string | null>(null);
    const [isLongLived, setIsLongLived] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateInvite = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await createInvitation(project.id);
            setToken(result.token);
        } catch (err) {
            console.error("Failed to create invitation:", err);
            setError("Failed to create invitation. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const inviteLink = token ? `${window.location.origin}/i?token=${token}` : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
            <div className="bg-[var(--neutral-100)] p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-6">
                <h2 className="text-[var(--foreground)] font-bold text-2xl">
                    Invite Collaborators
                </h2>

                {token ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-[var(--foreground)] text-md">Share this link with your collaborator:</p>
                        <div className="relative p-3 bg-[var(--neutral-200)] rounded-md break-all text-[var(--foreground)] transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-[var(--accent-500)]">
                            <span className="font-mono text-base">{inviteLink}</span>
                            <FiLink
                                size={24}
                                className="absolute top-1/2 -translate-y-1/2 right-3 text-[var(--accent-500)] cursor-pointer hover:text-[var(--accent-600)] transition-colors"
                                onClick={() => {
                                    navigator.clipboard.writeText(inviteLink || "");
                                }}
                            />
                        </div>
                        <div className="text-[var(--neutral-500)] text-sm mt-2 flex items-center gap-2">
                            <span className="text-lg text-[var(--foreground)]">Token:</span>
                            <span className="font-bold text-2xl text-[var(--accent-500)]">{token}</span>
                        </div>
                    </div>
                ) : (
                    <>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        {isLoading ? (
                            <Button
                                onClick={() => {}}
                                color="var(--neutral-500)"
                            >
                                Creating...
                            </Button>
                        ) : (
                            <>
                                <p>
                                    Create a link to let others quickly join your project 
                                </p>
                                <Button
                                    onClick={handleCreateInvite}
                                    color="var(--accent-500)"
                                >
                                    Create Invite
                                </Button>
                            </>
                        )}
                    </>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        color="var(--neutral-300)"
                        type="button"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
