"use client";

import { FaBook } from "react-icons/fa";
import Button from "./components/button";
import { useRouter } from "next/navigation";

const LandingPage = () => {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--neutral-100)] text-[var(--foreground)] p-6 gap-6">
            {/* Title with Book Icon */}
            <h1 className="text-4xl font-bold flex items-center gap-2">
                Learn with Coi <FaBook className="text-[var(--accent-500)]" />
            </h1>

            {/* Short paragraph */}
            <p className="text-center text-lg max-w-xl">
                Welcome to Coi! Learn, create, and collaborate on projects seamlessly with our interactive platform.
            </p>

            {/* Buttons */}
            <div className="flex gap-4 mt-4">
                <Button color="var(--accent-500)" onClick={() => router.push("/dashboard")}>
                    Go to Dashboard
                </Button>
                <Button color="var(--neutral-300)" onClick={() => router.push("/login?signup=true")}>
                    Sign Up
                </Button>
            </div>
        </div>
    );
};

export default LandingPage;
