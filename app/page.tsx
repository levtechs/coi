"use client";

import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FaXTwitter } from "react-icons/fa6";
import { RxDiscordLogo } from "react-icons/rx";
import { FiChevronDown, FiGithub } from "react-icons/fi";
import Button from "./components/button";
import Image from "next/image";

const LandingPage = () => {
    const router = useRouter();

    const landingPageRef = useRef<HTMLDivElement>(null);
    const walkthroughRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);

    const [isDark, setIsDark] = useState(false);
    const [showButtons, setShowButtons] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowButtons(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );
        if (walkthroughRef.current) {
            observer.observe(walkthroughRef.current);
        }
        return () => observer.disconnect();
    }, []);

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
            // If at the top section, scroll to the walkthrough section
            if (currentScrollY < (walkthroughRef.current?.offsetTop || Infinity)) {
                walkthroughRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        } else { // Scrolling up
            // If at the top of the walkthrough section, scroll back to the landing page
            if (currentScrollY <= (walkthroughRef.current?.offsetTop || 0)) {
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

    const scrollToWalkthrough = () => {
        walkthroughRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const themeFolder = isDark ? 'dark' : 'light';

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <div
                ref={landingPageRef}
                className="flex flex-col items-center justify-center min-h-screen bg-[var(--neutral-100)] text-[var(--foreground)] p-6 gap-6 transition-all duration-500"
            >
                <Image src="/logo.png" alt="Coi Logo" width={150} height={150} className="w-64 h-64" />
                <h1 className="text-4xl font-bold flex items-center gap-2">
                    Learn with Coi
                </h1>
                <p className="text-center text-lg max-w-xl">
                    Welcome to Coi! Learn, create, and collaborate on projects seamlessly with our interactive platform.
                </p>
                <div className="flex gap-4 mt-4">
                    <Button color="var(--neutral-500)" onClick={() => router.push("/dashboard")} className="px-6 py-3 text-lg">
                        Go to Dashboard
                    </Button>
                    <Button color="var(--accent-500)" onClick={() => router.push("/login?signup=true")} className="px-6 py-3 text-lg">
                        Get Started
                    </Button>
                </div>
                <button className="flex flex-col items-center mt-8">
                    <div className="text-sm font-semibold text-[var(--neutral-600)] animate-bounce flex items-center gap-1" onClick={scrollToWalkthrough}>
                        <FiChevronDown size={20} />
                        scroll for details
                        <FiChevronDown size={20} />
                    </div>
                </button>
            </div>

            {/* Walkthrough Section */}
            <div
                ref={walkthroughRef}
                className="flex flex-col items-center bg-[var(--neutral-200)] text-[var(--foreground)] p-6 min-h-screen relative"
            >
                <WalkthroughComponent themeFolder={themeFolder} />
            </div>

            {showButtons && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
                    <Button color="var(--neutral-500)" onClick={() => router.push("/dashboard")} className="px-6 py-3 text-lg">
                        Go to Dashboard
                    </Button>
                    <Button color="var(--accent-500)" onClick={() => router.push("/login?signup=true")} className="px-6 py-3 text-lg">
                        Get Started
                    </Button>
                </div>
            )}

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default LandingPage;

const WalkthroughComponent = ({ themeFolder }: { themeFolder: string }) => {
    const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const index = parseInt(entry.target.getAttribute('data-index') || '0');
                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => new Set(prev).add(index));
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        const elements = document.querySelectorAll('[data-index]');
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="w-full max-w-6xl">
            {/* Dashboard Section */}
            <div
                data-index={0}
                className={`flex items-center justify-center gap-8 py-8 transition-all duration-1000 ${
                    visibleSections.has(0) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                }`}
            >
                <div className="flex-1 text-right">
                    <p className="text-xl">Create projects to learn independently or share with a study group</p>
                </div>
                <div className="relative">
                    <Image
                        src={`/demos/${themeFolder}/dashboard.png`}
                        alt="Dashboard screenshot"
                        width={500}
                        height={375}
                        className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                    />
                </div>
            </div>

            {/* Chat Section */}
            <div
                data-index={1}
                className={`flex items-center justify-center gap-8 py-8 -mt-16 transition-all duration-1000 ${
                    visibleSections.has(1) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
                }`}
            >
                <div className="relative">
                    <Image
                        src={`/demos/${themeFolder}/chat.png`}
                        alt="Chat screenshot"
                        width={500}
                        height={375}
                        className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform -rotate-3"
                    />
                </div>
                <div className="flex-1 text-left">
                    <p className="text-xl">Learn with an adaptive AI tutor</p>
                </div>
            </div>

            {/* Notes Section */}
            <div
                data-index={2}
                className={`flex items-center justify-center gap-8 py-8 -mt-16 transition-all duration-1000 ${
                    visibleSections.has(2) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                }`}
            >
                <div className="flex-1 text-right">
                    <p className="text-xl">Organized hierarchy of notes curated for you and your study group as you learn</p>
                </div>
                <div className="relative">
                    <Image
                        src={`/demos/${themeFolder}/notes.png`}
                        alt="Notes screenshot"
                        width={500}
                        height={375}
                        className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                    />
                </div>
            </div>

            {/* Cards Section */}
            <div
                data-index={3}
                className={`flex items-center justify-center gap-8 py-8 -mt-16 transition-all duration-1000 ${
                    visibleSections.has(3) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
                }`}
            >
                <div className="relative flex items-start">
                    <Image
                        src={`/demos/${themeFolder}/card1.png`}
                        alt="Card1 screenshot"
                        width={500}
                        height={375}
                        className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3 z-10"
                    />
                    <Image
                        src={`/demos/${themeFolder}/card2.png`}
                        alt="Card2 screenshot"
                        width={500}
                        height={375}
                        className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform -rotate-2 -ml-32 z-20"
                    />
                </div>
                <div className="flex-1 text-left">
                    <p className="text-xl">Cards generated automatically with information and resources</p>
                </div>
            </div>

            {/* Quiz Section */}
            <div
                data-index={4}
                className={`flex items-center justify-center gap-8 py-8 -mt-16 transition-all duration-1000 ${
                    visibleSections.has(4) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                }`}
            >
                <div className="flex-1 text-right">
                    <p className="text-xl">Test your knowledge with custom-generated quizzes</p>
                </div>
                <div className="relative">
                    <Image
                        src={`/demos/${themeFolder}/quiz.png`}
                        alt="Quiz screenshot"
                        width={500}
                        height={375}
                        className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                    />
                </div>
            </div>
        </div>
    );
};

const Footer = () => {
    return (
        <footer className="bg-[var(--neutral-100)] text-[var(--foreground)] p-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                <div className="text-left">
                    <p className="text-lg text-[var(--neutral-500)] mb-4">
                        Interested in contributing? Check out the{' '}
                        <a
                            className="text-[var(--accent-500)] hover:underline"
                            href="https://github.com/levtechs/coi"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub repository
                        </a>
                        . Everything is open-source and contributions are welcome!
                    </p>
                    <p className="text-lg text-[var(--neutral-500)]">
                        Please report bugs or suggest features via the{' '}
                        <a
                            className="text-[var(--accent-500)] hover:underline"
                            href="https://github.com/levtechs/coi/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub issues page
                        </a>
                        {' '}or by reaching out to me directly on X or Discord!
                    </p>
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-4">
                        Created by Lev Smolsky
                    </h2>
                    <div className="flex justify-center gap-4">
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
                </div>
                <div className="text-right">
                    <p className="text-lg text-[var(--neutral-500)]">
                        Contact: <a href="mailto:info@coilearn.com" className="text-[var(--accent-500)] hover:underline">info@coilearn.com</a>
                    </p>
                </div>
            </div>
        </footer>
    );
};
