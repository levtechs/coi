"use client";

import Button from "@/app/components/button";
import { Project, User } from "@/lib/types";

interface ProjectsTableProps {
    projects: Project[];
    selectedUser: User | null;
    userProjects: Project[];
    onShowAllProjects: () => void;
    onLoadMore: () => void;
    loadingMore: boolean;
}

export default function ProjectsTable({ projects, selectedUser, userProjects, onShowAllProjects, onLoadMore, loadingMore }: ProjectsTableProps) {
    return (
        <div>
            <h2 className="text-2xl mb-4">{selectedUser ? `Projects for ${selectedUser.displayName}` : 'Projects'}</h2>
            {selectedUser && (
                <Button color="var(--neutral-400)" onClick={onShowAllProjects} className="mb-4">
                    Show All Projects
                </Button>
            )}
            <div className="overflow-x-auto">
                <table className="w-full table-auto bg-[var(--neutral-300)] rounded-md">
                    <thead>
                        <tr className="bg-[var(--neutral-300)]">
                            <th className="px-4 py-2 text-left">ID</th>
                            <th className="px-4 py-2 text-left">Title</th>
                            <th className="px-4 py-2 text-left">Owner</th>
                            <th className="px-4 py-2 text-left">Collaborators</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(selectedUser ? userProjects : projects).map(project => (
                            <tr key={project.id} className="border-t hover:bg-[var(--neutral-200)]">
                                <td className="px-4 py-2">{project.id}</td>
                                <td className="px-4 py-2">{project.title}</td>
                                <td className="px-4 py-2">{project.ownerId}</td>
                                <td className="px-4 py-2">{project.collaborators.join(', ')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!selectedUser && (
                <Button color="var(--accent-500)" onClick={onLoadMore}>
                    {loadingMore ? "Loading..." : "Load More Projects"}
                </Button>
            )}
        </div>
    );
}