"use client";

import { useEffect, useState } from "react";
import { getAdminDetails, getMoreUsers, getAdminStats } from "@/app/views/admin";
import { Project, User } from "@/lib/types";
import LoadingComponent from "@/app/components/loading";
import { useAuth } from "@/lib/AuthContext";
import LoginPrompt from "../../components/login_prompt";
import UsersTable from "../../components/admin/UsersTable";
import UserDetailsModal from "../../components/admin/UserDetailsModal";

const AdminUsersPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [totalUsers, setTotalUsers] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const [adminData, stats] = await Promise.all([getAdminDetails(), getAdminStats()]);
                setProjects(adminData.projects);
                const usersWithProjectIds = adminData.users.map(user => ({
                    ...user,
                    projectIds: adminData.projects.filter(p => p.ownerId === user.id || p.collaborators.includes(user.email)).map(p => p.id)
                }));
                setUsers(usersWithProjectIds);
                setTotalUsers(stats.totalUsers);
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
            setUsers(prev => {
                const newUsers = moreUsersWithIds.filter(user => !prev.some(p => p.id === user.id));
                return [...prev, ...newUsers];
            });
        } catch (err) {
            console.error("Error loading more users:", err);
        } finally {
            setLoadingMoreUsers(false);
        }
    };

    const handleUserClick = (user: User) => {
        setSelectedUser(user);
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
        <>
            <div className="max-w-7xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
                <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-8">Users</h1>
                <UsersTable
                    users={users}
                    totalUsers={totalUsers}
                    onUserClick={handleUserClick}
                    onLoadMore={loadMoreUsers}
                    loadingMore={loadingMoreUsers}
                />
            </div>
            <UserDetailsModal selectedUser={selectedUser} onClose={() => setSelectedUser(null)} />
        </>
    );
};

export default AdminUsersPage;