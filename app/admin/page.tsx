"use client";

import { useEffect, useState } from "react";
import { getAdminStats } from "@/app/views/admin";
import LoadingComponent from "@/app/components/loading";
import { useAuth } from "@/lib/AuthContext";
import LoginPrompt from "../components/login_prompt";
import { auth } from "@/lib/firebase";

const AdminDashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<{ totalUsers: number; totalProjects: number; totalActions: number; usersWithSignUp: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const stats = await getAdminStats();
                setStats(stats);
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

    if (!stats) {
        return <div>Error loading stats</div>;
    }

    const { totalUsers, totalProjects, totalActions, usersWithSignUp } = stats;

    return (
        <div className="max-w-7xl mx-auto bg-[var(--neutral-100)] shadow-lg rounded-lg p-8">
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] mb-8">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Total Users</h3>
                    <p className="text-3xl font-bold">{totalUsers}</p>
                </div>
                <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Total Projects</h3>
                    <p className="text-3xl font-bold">{totalProjects}</p>
                </div>
                <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Total Actions</h3>
                    <p className="text-3xl font-bold">{totalActions}</p>
                </div>
                    <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">Users with Filled Out Questionnaire</h3>
                        <p className="text-3xl font-bold">{usersWithSignUp}</p>
                      </div>
              </div>
              <button onClick={async () => {
                  const token = await auth.currentUser?.getIdToken(true);
                  console.log("FIREBASE_ID_TOKEN:", token);
                  alert("ID Token logged to console");
              }} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">Print ID Token</button>
          </div>
    );
};

export default AdminDashboard;
