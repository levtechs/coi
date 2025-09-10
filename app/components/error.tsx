"use client"

import Image from 'next/image';
import Link from 'next/link';

interface ErrorParams {
    h1?: string;
    h2?: string;
    p?: string;
}

export default function Error({ h1, h2, p}: ErrorParams) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-[var(--foreground)] bg-[var(--background)]">
            <Image src="/error.png" alt="Not Found" width={200} height={200} className="mb-8" />
            {h1 && <h1 className="text-6xl font-bold mb-4">{h1}</h1>}
            {h2 && <h2 className="text-3xl font-semibold mb-2">{h2}</h2>}
            {p && <p className="mb-8">{p}</p>}
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] transition-colors duration-300">
                    Return Home
            </Link>
        </div>
    );
}