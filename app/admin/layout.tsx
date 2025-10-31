"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            <header className="bg-[var(--neutral-100)] shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <nav className="flex gap-6">
                        <Link href="/admin" className={`px-4 py-2 rounded-lg transition ${pathname === '/admin' ? 'bg-[var(--accent-500)] text-white' : 'hover:bg-[var(--neutral-200)]'}`}>
                            Dashboard
                        </Link>
                        <Link href="/admin/users" className={`px-4 py-2 rounded-lg transition ${pathname === '/admin/users' ? 'bg-[var(--accent-500)] text-white' : 'hover:bg-[var(--neutral-200)]'}`}>
                            Users
                        </Link>
                        <Link href="/admin/projects" className={`px-4 py-2 rounded-lg transition ${pathname === '/admin/projects' ? 'bg-[var(--accent-500)] text-white' : 'hover:bg-[var(--neutral-200)]'}`}>
                            Projects
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="p-6">
                {children}
            </main>
        </div>
    );
}