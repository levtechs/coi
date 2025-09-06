import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

import { Mona_Sans } from 'next/font/google';

const font = Mona_Sans({
    subsets: ['latin'],
    display: 'swap', // optional, helps with font loading
});

export const metadata: Metadata = {
    title: "coi",
    description: "Group learning with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={font.className}>
            <body>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}