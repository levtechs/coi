import Link from "next/link";

import { FiEdit2 } from "react-icons/fi";
import { FiHome } from "react-icons/fi";

import CollaboratorsDropdown from "./collabs_dd";
import ShareMenu from "./share";
import { ModalContents } from "../types";
import { Project } from "@/lib/types";

interface MenuBarProps {
    project: Project;
    user: { uid: string } | null;
    setProject: (updater: (prev: Project | null) => Project | null) => void;
    addCollaborator: (projectId: string, email: string) => Promise<void>;
    setTitle: (projectId: string, newTitle: string) => Promise<void>;
    setModalContents: (newContent: ModalContents) => void
}

const MenuBar = ( {project, user, setProject, addCollaborator, setTitle, setModalContents} : MenuBarProps) => {
    return (
        <div className="flex items-center justify-between mb-4 border-b border-[var(--neutral-300)] pb-4">
            {/* Left side: Home + Title + Edit */}
            <div className="flex items-center gap-2">
                <Link href="/dashboard">
                    <FiHome
                        size={22}
                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                    />
                </Link>
                <div className="flex items-center gap-2 group">
                    <h1 className="text-[var(--foreground)] text-2xl font-bold">{project.title}</h1>
                    <FiEdit2
                        className="text-[var(--accent-500)] cursor-pointer opacity-0 group-hover:opacity-100 hover:text-[var(--accent-600)] transition"
                        size={20}
                        onClick={() =>
                            setModalContents({
                                isOpen: true,
                                title: "Edit title",
                                initialValue: "",
                                placeholder: "Enter new title",
                                onSubmit: async (input) => {
                                    if (!user || !input.trim()) return;

                                    // Update the title in the database
                                    await setTitle(project.id, input);

                                    // Update local state
                                    setProject((prev) =>
                                        prev ? { ...prev, title: input.trim() } : prev
                                    );
                                },
                            })
                        }
                    />
                </div>
            </div>

            {/* Right side: Share + Collaborators */}
            <div className="flex items-center gap-4">
                <CollaboratorsDropdown 
                    sharedWith={project.sharedWith || []} 
                    ownerId={project.ownerId}
                />
                <ShareMenu 
                    project={project} 
                    user={user} 
                    setModalContents={setModalContents}
                    addCollaborator={addCollaborator}
                    setProject={setProject}
                />
            </div>
        </div>

    )
}

export default MenuBar