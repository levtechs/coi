// This is a core next.js file that handles 404 errors. DO NOT RENAME OR MOVE.

import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-[var(--foreground)] bg-[var(--background)]">
        <Image src="/error.png" alt="Not Found" width={200} height={200} className="mb-8" />
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-3xl font-semibold mb-2">Page Not Found</h2>
        <p className="mb-8">Could not find the requested resource.</p>
        <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] transition-colors duration-300">
                Return Home
        </Link>
    </div>
  );
}