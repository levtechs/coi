"use client";

import Button from "@/app/components/button";
import { User } from "@/lib/types";

interface UsersTableProps {
    users: User[];
    totalUsers: number;
    onUserClick: (user: User) => void;
    onLoadMore: () => void;
    loadingMore: boolean;
}

export default function UsersTable({ users, totalUsers, onUserClick, onLoadMore, loadingMore }: UsersTableProps) {
    return (
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
                            <th className="px-4 py-2 text-left">Sign Up</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-t cursor-pointer hover:bg-[var(--neutral-200)]" onClick={() => onUserClick(user)}>
                                <td className="px-4 py-2">{user.id}</td>
                                <td className="px-4 py-2">{user.displayName}</td>
                                <td className="px-4 py-2">{user.email}</td>
                                <td className="px-4 py-2">{user.projectIds?.length ?? 0}</td>
                                <td className="px-4 py-2">{user.actions ?? "N/A"}</td>
                                <td className="px-4 py-2">{user.dailyActions ?? "N/A"}</td>
                                <td className="px-4 py-2">{user.weeklyActions ?? "N/A"}</td>
                                <td className="px-4 py-2"><input type="checkbox" checked={!!user.signUpResponses} readOnly /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Button color="var(--accent-500)" onClick={onLoadMore} disabled={users.length >= totalUsers}>
                {loadingMore ? "Loading..." : "Load More Users"}
            </Button>
        </div>
    );
}