"use client"

import { useState, useEffect } from "react";

import Link from "next/link";
import { FiHome, FiStar } from "react-icons/fi";

import LoadingComponent from "../loading";
import Error from "../error";

import { User } from "@/lib/types";
import { getUserFromId } from "@/app/views/users";

interface ProfilePageProps {
    userId: string;
}

const ProfilePage = ({ userId }: ProfilePageProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const fetched = await getUserFromId(userId);
                if (!fetched) {
                    setError("User not found");
                    setUser(null);
                } else {
                    setUser(fetched);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch user");
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [userId]);

    if (isLoading) return <LoadingComponent loadingText="Loading profile" />;
    if (error) return <Error h2={error} p="Please try again later" />;
    if (!user) return <Error h2="No user found" p="Please try again later" />;

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-[var(--neutral-100)] rounded-xl shadow-md">
            <div className="flex justify-between items-center">
                <Link href="/dashboard">
                    <FiHome
                        size={32}
                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] cursor-pointer"
                    />
                </Link>
                {user.starUser && (
                    <FiStar
                        size={32}
                        className="text-yellow-500"
                    />
                )}
            </div>
            <hr className="border-2 border-[var(--neutral-200)] mt-4 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{user.displayName}</h2>
            <p className="text-sm text-[var(--neutral-700)] mb-4">{user.email}</p>

            <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Badges</h3>
                <div className="flex flex-wrap gap-2">
                    {/* Replace with actual badges if available */}
                    <span className="text-sm text-[var(--neutral-500)] italic">No badges yet</span>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
