"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/button";
import { getAdminDetails, getMoreProjects, getMoreUsers, getProjectsForUser } from "@/app/views/admin";
import { Project, User } from "@/lib/types";
import LoadingComponent from "@/app/components/loading";
import { useAuth } from "@/lib/AuthContext";
import LoginPrompt from "../components/login_prompt";

const AdminPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [view, setView] = useState<'projects' | 'users'>('users');
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userProjects, setUserProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMoreProjects, setLoadingMoreProjects] = useState(false);
    const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const adminData = await getAdminDetails();
                setProjects(adminData.projects);
                const usersWithProjectIds = adminData.users.map(user => ({
                    ...user,
                    projectIds: adminData.projects.filter(p => p.ownerId === user.id || p.collaborators.includes(user.email)).map(p => p.id)
                }));
                setUsers(usersWithProjectIds);
                setError(null);
            } catch (err) {
                console.error("Error fetching admin data:", err);
                setError("Access denied: You do not have admin privileges.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    useEffect(() => {
        if (selectedUser) {
            const fetchUserProjects = async () => {
                try {
                    const data = await getProjectsForUser(selectedUser.id);
                    setUserProjects(data);
                } catch (err) {
                    console.error("Error fetching user projects:", err);
                }
            };
            fetchUserProjects();
        } else {
            setUserProjects([]);
        }
    }, [selectedUser]);

    const loadMoreProjects = async () => {
        if (projects.length === 0) return;
        setLoadingMoreProjects(true);
        try {
            const lastId = projects[projects.length - 1].id;
            const moreProjects = await getMoreProjects(lastId);
            setProjects(prev => [...prev, ...moreProjects]);
        } catch (err) {
            console.error("Error loading more projects:", err);
        } finally {
            setLoadingMoreProjects(false);
        }
    };

    const loadMoreUsers = async () => {
        if (users.length === 0) return;
        setLoadingMoreUsers(true);
        try {
            const lastId = users[users.length - 1].id;
            const moreUsers = await getMoreUsers(lastId);
            const moreUsersWithIds = moreUsers.map(user => ({
                ...user,
                projectIds: projects.filter(p => p.ownerId === user.id || p.collaborators.includes(user.email)).map(p => p.id)
            }));
            setUsers(prev => [...prev, ...moreUsersWithIds]);
        } catch (err) {
            console.error("Error loading more users:", err);
        } finally {
            setLoadingMoreUsers(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--foreground)]">
                <p className="text-xl">Loading authentication...</p>
            </div>
        );
    }

    if (!user) {
        return (<LoginPrompt page={"the admin panel"} />);
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 flex items-center justify-center">
                <div className="bg-[var(--neutral-100)] shadow-lg rounded-lg p-8 max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return <LoadingComponent loadingText="Loading admin data" />;
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
            <div className="max-w-7xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
                <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-8">Admin Panel</h1>
                <div className="flex gap-4 mb-8">
                    <Button color={view === 'users' ? 'var(--accent-500)' : 'var(--neutral-400)'} onClick={() => setView('users')}>
                        Users ({users.length})
                    </Button>
                    <Button color={view === 'projects' ? 'var(--accent-500)' : 'var(--neutral-400)'} onClick={() => setView('projects')}>
                        Projects ({projects.length})
                    </Button>
                </div>
                {view === 'projects' && (
                    <div>
                        <h2 className="text-2xl mb-4">{selectedUser ? `Projects for ${selectedUser.displayName}` : 'Projects'}</h2>
                        {selectedUser && (
                            <Button color="var(--neutral-400)" onClick={() => setSelectedUser(null)} className="mb-4">
                                Show All Projects
                            </Button>
                        )}
                        <ul className="space-y-4 mb-4">
                            {(selectedUser ? userProjects : projects).map(project => (
                                <li key={project.id} className="bg-[var(--neutral-50)] p-4 rounded">
                                    <h3 className="font-bold">{project.title}</h3>
                                    <p>Owner: {project.ownerId}</p>
                                    <p>Collaborators: {project.collaborators.join(', ')}</p>
                                </li>
                            ))}
                        </ul>
                        {!selectedUser && (
                            <Button color="var(--accent-500)" onClick={loadMoreProjects}>
                                {loadingMoreProjects ? "Loading..." : "Load More Projects"}
                            </Button>
                        )}
                    </div>
                )}
                {view === 'users' && (
                    <div>
                        <h2 className="text-2xl mb-8">Users</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto bg-[var(--neutral-300)] rounded-md">
                                <thead>
                                    <tr className="bg-[var(--neutral-300)]">
                                        <th className="px-4 py-2 text-left">ID</th>
                                        <th className="px-4 py-2 text-left">Name</th>
                                        <th className="px-4 py-2 text-left">Email</th>
                                        <th className="px-4 py-2 text-left">Projects</th>
                                        <th className="px-4 py-2 text-left">Actions</th>
                                        <th className="px-4 py-2 text-left">Daily</th>
                                        <th className="px-4 py-2 text-left">Weekly</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-t cursor-pointer hover:bg-[var(--neutral-200)]" onClick={() => { setSelectedUser(user); setView('projects'); }}>
                                            <td className="px-4 py-2">{user.id}</td>
                                            <td className="px-4 py-2">{user.displayName}</td>
                                            <td className="px-4 py-2">{user.email}</td>
                                            <td className="px-4 py-2">{user.projectIds?.length ?? 0}</td>
                                            <td className="px-4 py-2">{user.actions ?? "N/A"}</td>
                                            <td className="px-4 py-2">{user.dailyActions ?? "N/A"}</td>
                                            <td className="px-4 py-2">{user.weeklyActions ?? "N/A"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button color="var(--accent-500)" onClick={loadMoreUsers}>
                            {loadingMoreUsers ? "Loading..." : "Load More Users"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;
