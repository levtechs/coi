import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";

import { Mona_Sans } from 'next/font/google';

const font = Mona_Sans({
    subsets: ['latin'],
    display: 'swap', // optional, helps with font loading
});

export const metadata: Metadata = {
    title: "coi",
    description: "Group learning with AI",
    openGraph: {
        title: "coi",
        description: "Group learning with AI",
        url: "https://coilearn.com",
        siteName: "coi",
        images: [
            {
                url: "https://coilearn.com/land.png",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "coi",
        description: "Group learning with AI",
        images: ["https://coilearn.com/land.png"],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={font.className} suppressHydrationWarning>
            <body>
                <ThemeProvider>
                    <AuthProvider>{children}</AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}