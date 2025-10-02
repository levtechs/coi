"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { FaXTwitter } from "react-icons/fa6";
import { RxDiscordLogo } from "react-icons/rx";
import { FiChevronDown, FiGithub } from "react-icons/fi";
import Button from "./components/button";
import Image from "next/image";

const LandingPage = () => {
    const landingPageRef = useRef<HTMLDivElement>(null);
    const walkthroughRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);

    const [isDark, setIsDark] = useState(false);
    const [showButtons, setShowButtons] = useState(false);
    const [isFooterIntersecting, setIsFooterIntersecting] = useState(false);
    const [animationsEnabled, setAnimationsEnabled] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        const updateSettings = () => {
            setAnimationsEnabled(!reducedMotionQuery.matches && !mobileQuery.matches);
            setIsMobile(mobileQuery.matches);
            setReducedMotion(reducedMotionQuery.matches);
        };
        updateSettings();
        reducedMotionQuery.addEventListener('change', updateSettings);
        mobileQuery.addEventListener('change', updateSettings);
        return () => {
            reducedMotionQuery.removeEventListener('change', updateSettings);
            mobileQuery.removeEventListener('change', updateSettings);
        };
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

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsFooterIntersecting(entry.isIntersecting);
            },
            { threshold: 0 }
        );
        if (footerRef.current) {
            observer.observe(footerRef.current);
        }
        return () => observer.disconnect();
    }, []);

    // This function handles the scroll snapping
    const handleScroll = useCallback((e: WheelEvent) => {
        // Skip scroll snapping on mobile
        if (isMobile) {
            return;
        }
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
                walkthroughRef.current?.scrollIntoView({ behavior: animationsEnabled ? 'smooth' : 'auto' });
            }
        } else { // Scrolling up
            // If at the top of the walkthrough section, scroll back to the landing page
            if (currentScrollY <= (walkthroughRef.current?.offsetTop || 0)) {
                landingPageRef.current?.scrollIntoView({ behavior: animationsEnabled ? 'smooth' : 'auto' });
            }
        }

        // Reset the scrolling flag after a brief delay
        setTimeout(() => {
            isScrolling.current = false;
        }, 1000);
    }, [animationsEnabled, isMobile]);

    // Attach and clean up the scroll listener
    useEffect(() => {
        window.addEventListener('wheel', handleScroll);
        return () => window.removeEventListener('wheel', handleScroll);
    }, [handleScroll]);

    const scrollToWalkthrough = () => {
        walkthroughRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    };

    const themeFolder = isDark ? 'dark' : 'light';

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <div
                ref={landingPageRef}
                className={`flex flex-col items-center justify-center min-h-screen bg-[var(--neutral-100)] text-[var(--foreground)] p-6 gap-3 ${animationsEnabled ? 'transition-all duration-500' : ''}`}
            >
                <Image src="/logo.png" alt="Coi Logo" width={150} height={150} className="w-64 h-64" />
                <h1 className="text-4xl font-bold flex items-center gap-2">
                    Learn with Coi
                </h1>
                <p className="text-center text-lg max-w-xl mb-4">
                    Welcome to Coi! Learn, create, and collaborate on projects seamlessly with our interactive platform.
                </p>
                <Buttons />
                <p className="text-center text-xl font-bold max-w-xl text-[var(--accent-400)]" style={{ textShadow: '0 0 10px var(--accent-100)' }}>
                    Right now, it&apos;s 100% FREE!
                </p>
                <button className="flex flex-col items-center mt-12">
                    <div className={`text-sm font-semibold text-[var(--neutral-600)] ${animationsEnabled ? 'animate-bounce' : ''} flex items-center gap-1`} onClick={scrollToWalkthrough}>
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
                <WalkthroughComponent themeFolder={themeFolder} animationsEnabled={animationsEnabled} isMobile={isMobile} />
                <div className={`${isFooterIntersecting ? "absolute w-full" : "fixed w-screen"} bottom-0 pb-4 p-6 transition-all duration-500 ${showButtons ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-full pointer-events-none'}`}>
                    <Buttons />
                </div>
            </div>

            {/* Footer */}
            <Footer ref={footerRef} />
        </div>
    );
};

export default LandingPage;

const Buttons = () => {
    const router = useRouter();
    return (
        <div className="w-full md:w-64 justify-center flex gap-4 mt-4 mx-auto">
            <Button color="var(--neutral-500)" onClick={() => router.push("/dashboard")} className="flex-1 md:flex-none px-0 py-3 md:px-6 md:py-3 md:text-lg">
                Go to Dashboard
            </Button>
            <Button color="var(--accent-500)" onClick={() => router.push("/login?signup=true")} className="flex-1 md:flex-none px-0 py-3 md:px-6 md:py-3 md:text-lg">
                Get Started
            </Button>
        </div>
    )
}

const WalkthroughComponent = ({ themeFolder, animationsEnabled, isMobile }: { themeFolder: string, animationsEnabled: boolean, isMobile: boolean }) => {
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
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(0) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : 'translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/dashboard.png`}
                                alt="Dashboard screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Create projects to learn independently or share with a study group</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-1 text-right">
                            <p className="text-md md:text-xl">Create projects to learn independently or share with a study group</p>
                        </div>
                        <div className="relative transform translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/dashboard.png`}
                                alt="Dashboard screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                            />
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}

            {/* Chat Section */}
            <div
                data-index={1}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(1) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : '-translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/chat.png`}
                                alt="Chat screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Learn with an adaptive AI tutor</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="relative transform -translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/chat.png`}
                                alt="Chat screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform -rotate-3"
                            />
                        </div>
                        <div className="flex-1 text-left min-w-xl">
                            <p className="text-md md:text-xl">Learn with an adaptive AI tutor</p>
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}

            {/* Notes Section */}
            <div
                data-index={2}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(2) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : 'translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/notes.png`}
                                alt="Notes screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Organized hierarchy of notes curated for you and your study group as you learn</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-1 text-right">
                            <p className="text-md md:text-xl">Organized hierarchy of notes curated for you and your study group as you learn</p>
                        </div>
                        <div className="relative -transform translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/notes.png`}
                                alt="Notes screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                            />
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}

            {/* Cards Section */}
            <div
                data-index={3}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(3) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : '-translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="relative flex justify-center items-center gap-4 max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/card1.png`}
                                alt="Card1 screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                            <Image
                                src={`/demos/${themeFolder}/card2.png`}
                                alt="Card2 screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Cards generated automatically with information and resources</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="relative flex items-start transform -translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
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
                            <p className="text-md md:text-xl">Cards generated automatically with information and resources</p>
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}

            {/* Quiz Section */}
            <div
                data-index={4}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 mb-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(4) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : 'translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/quiz.png`}
                                alt="Quiz screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Test your knowledge with custom-generated quizzes</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-1 text-right">
                            <p className="text-md md:text-xl">Test your knowledge with custom-generated quizzes</p>
                        </div>
                        <div className="relative transform translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/quiz.png`}
                                alt="Quiz screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                            />
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}
        </div>
    );
};

const Footer = React.forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <footer ref={ref} className="bg-[var(--neutral-100)] text-[var(--foreground)] p-6 w-full">
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
                <div className="text-center md:text-right">
                    <p className="text-lg text-[var(--neutral-500)]">
                        Contact: <a href="mailto:info@coilearn.com" className="text-[var(--accent-500)] hover:underline">info@coilearn.com</a>
                    </p>
                </div>
            </div>
        </footer>
    );
});

Footer.displayName = 'Footer';
