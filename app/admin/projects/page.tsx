"use client";

import { useEffect, useState } from "react";
import { getAdminDetails, getMoreProjects, getProjectsForUser } from "@/app/views/admin";
import { Project, User } from "@/lib/types";
import LoadingComponent from "@/app/components/loading";
import { useAuth } from "@/lib/AuthContext";
import LoginPrompt from "../../components/login_prompt";
import ProjectsTable from "../../components/admin/ProjectsTable";

const AdminProjectsPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userProjects, setUserProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMoreProjects, setLoadingMoreProjects] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const adminData = await getAdminDetails();
                setProjects(adminData.projects);
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

    const handleShowAllProjects = () => {
        setSelectedUser(null);
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
        <div className="max-w-7xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-8">Projects</h1>
            <ProjectsTable
                projects={projects}
                selectedUser={selectedUser}
                userProjects={userProjects}
                onShowAllProjects={handleShowAllProjects}
                onLoadMore={loadMoreProjects}
                loadingMore={loadingMoreProjects}
            />
        </div>
    );
};

export default AdminProjectsPage;