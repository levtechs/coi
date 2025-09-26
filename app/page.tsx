"use client";

import React, { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import { FaXTwitter } from "react-icons/fa6";
import { RxDiscordLogo } from "react-icons/rx";
import { FiChevronDown, FiGithub } from "react-icons/fi";
import Button from "./components/button";
import Image from "next/image";

const LandingPage = () => {
    const router = useRouter();

    const landingPageRef = useRef<HTMLDivElement>(null);
    const detailsPageRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);

    // This function handles the scroll snapping
    const handleScroll = (e: WheelEvent) => {
        // Prevent multiple scroll events from firing at once
        if (isScrolling.current) {
            return;
        }

        isScrolling.current = true;
        const currentScrollY = window.scrollY;

        // Determine if scrolling down or up
        if (e.deltaY > 0) { // Scrolling down
            // If at the top section, scroll to the details section
            if (currentScrollY < (detailsPageRef.current?.offsetTop || Infinity)) {
                detailsPageRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        } else { // Scrolling up
            // If at the details section, scroll back to the landing page
            if (currentScrollY > (landingPageRef.current?.offsetTop || -Infinity)) {
                landingPageRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        // Reset the scrolling flag after a brief delay
        setTimeout(() => {
            isScrolling.current = false;
        }, 1000);
    };

    // Attach and clean up the scroll listener
    useEffect(() => {
        window.addEventListener('wheel', handleScroll);
        return () => window.removeEventListener('wheel', handleScroll);
    }, []);

    const scrollToDetails = () => {
        detailsPageRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="flex flex-col">
            {/* Main Landing Page Section */}
            <div
                ref={landingPageRef}
                className="flex flex-col items-center justify-center min-h-screen bg-[var(--neutral-100)] text-[var(--foreground)] p-6 gap-6 transition-all duration-500"
            >
                <Image src="/logo.png" alt="Coi Logo"  width={150} height={150} className="w-64 h-64" />
                {/* Title with Book Icon */}
                <h1 className="text-4xl font-bold flex items-center gap-2">
                    Learn with Coi
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

                {/* Oscillating text */}
                <button className="flex flex-col items-center mt-8" >
                    <div className="text-sm font-semibold text-[var(--neutral-600)] animate-bounce flex items-center gap-1" onClick={scrollToDetails}>
                        <FiChevronDown size={20} />
                        details 
                        <FiChevronDown size={20} />
                    </div>
                </button>
            </div>

            {/* Details Section */}
            <div
                ref={detailsPageRef}
                className="flex flex-col items-center justify-center min-h-screen bg-[var(--neutral-200)] text-[var(--foreground)] p-6"
            >
                <DetailsComponent />
            </div>
        </div>
    );
};

export default LandingPage;

const DetailsComponent = () => {
    return (
        <div className="flex flex-col items-center justify-center p-6 gap-4">
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Created by Lev Smolsky
            </h2>
            <div className="flex gap-4">
                <a 
                    href="https://x.com/levtechs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--neutral-700)] hover:text-[var(--accent-500)] transition-colors"
                    aria-label="Twitter"
                >
                    <FaXTwitter size={32} />
                </a>
                <a 
                    href="https://github.com/levtechs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--neutral-700)] hover:text-[var(--accent-500)] transition-colors"
                    aria-label="GitHub"
                >
                    <FiGithub size={32} />
                </a>
                <a 
                    href="https://discordapp.com/users/739263047318634637" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--neutral-700)] hover:text-[var(--accent-500)] transition-colors"
                    aria-label="Discord"
                >
                    <RxDiscordLogo size={32} />
                </a>
            </div>
            <h3 className="text-center text-lg max-w-xl text-[var(--neutral-500)] mt-8">
                Interested in contributing?
                <div className="text-[var(--foreground)] font-semibold">
                    Check out the 
                    <a 
                        className="text-[var(--accent-500)] hover:underline mr-1 ml-1"
                        href="https://github.com/levtechs/coi" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                    >
                        GitHub repository
                    </a>
                </div>
                Everything is open-source and contributions are welcome!
            </h3>
            <h3 className="text-center text-lg max-w-xl text-[var(--neutral-500)] mt-8">
                Please report bugs or suggest features via the
                <a 
                    className="text-[var(--accent-500)] hover:underline mr-1 ml-1"
                    href="https://github.com/levtechs/coi/issues" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                >
                    GitHub issues page
                </a>
                or by reaching out to me directly on X or Discord!
            </h3>
        </div>
    );
};