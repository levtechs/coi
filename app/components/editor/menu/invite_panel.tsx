import { useState } from "react";
import Button from "@/app/components/button";
import { Project } from "@/lib/types";
import { createInvitation } from "@/app/views/invite";
import { FiCopy } from "react-icons/fi";

type InvitePanelProps = {
    project: Project;
    onClose?: () => void;
};

export default function InvitePanel({ onClose, project }: InvitePanelProps) {
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreateInvite = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await createInvitation(project.id);
            setInviteUrl(`${window.location.origin}/i?token=${result.token}`);
        } catch (err) {
            console.error("Failed to create invitation:", err);
            setError("Failed to create invitation. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {inviteUrl ? (
                <div className="flex flex-col gap-4">
                    <p className="text-[var(--foreground)] text-md">Share this invite link:</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={inviteUrl}
                            readOnly
                            className="flex-1 border border-[var(--neutral-300)] rounded-md p-2 bg-[var(--neutral-100)] text-[var(--foreground)]"
                        />
                        <Button
                            color="var(--accent-500)"
                            onClick={() => {
                                navigator.clipboard.writeText(inviteUrl);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                        >
                            <FiCopy className="h-[20px] w-[20px]" />
                        </Button>
                    </div>
                    {copied && <p className="text-[var(--accent-500)] text-sm">Copied!</p>}
                </div>
            ) : (
                <>
                    <p className="text-[var(--foreground)] mb-4">Create an invite link for this project:</p>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <Button
                        onClick={handleCreateInvite}
                        color="var(--accent-500)"
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? "Creating..." : "Create Invite Link"}
                    </Button>
                </>
            )}

            {onClose && (
                <div className="flex justify-end gap-2 mt-6">
                    <Button
                        color="var(--neutral-300)"
                        type="button"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>
            )}
        </div>
    );
}
