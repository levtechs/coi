import { FiEdit2 } from "react-icons/fi";

import { Project } from "@/lib/types";

import { ModalContents } from "./types";

interface ContentPanelProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    setContent: (uid: string, projectId: string, newContent: string) => Promise<void>;
    setModalContents: (newContent: ModalContents) => void
}

const ContentPanel = ( {project, user, setProject, setContent, setModalContents} : ContentPanelProps) => {
    return (
        <div className="flex-1">
            <div className="relative group p-3 bg-[var(--neutral-200)] rounded-md text-[var(--foreground)] whitespace-pre-wrap">
                {/* Edit Icon */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                    <FiEdit2
                        className="text-[var(--accent-500)] cursor-pointer hover:text-[var(--accent-600)]"
                        size={20}
                        onClick={() => setModalContents({ isOpen: true, title: "New content", initialValue: "", placeholder: "Enter new content", onSubmit: async (input) =>{
                            if (!user) return;

                            // Add collaborator in DB
                            await setContent(user.uid, project.id, input);

                            // Update local state
                            setProject((prev) =>
                                prev
                                    ? {
                                        ...prev,
                                        content: input,   // ✅ replace content
                                    }
                                    : prev
                            );

                        }})}                            />
                </div>

                <h2 className="text-[var(--foreground)] text-xl font-semibold mb-2">Content</h2>
                {project.content || "(No content)"}
            </div>
        </div>
    );
}

export default ContentPanel