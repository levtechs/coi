"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { FiChevronDown } from "react-icons/fi";
import Image from "next/image";
import { FlickeringGrid } from "../../components/flickering-grid";
import Buttons from "./buttons";
import WalkthroughComponent from "./walkthrough";
import Testimonials from "./testimonials_component";
import Footer from "./footer";

const LandingPage = () => {
    const landingPageRef = useRef<HTMLDivElement>(null);
    const walkthroughRef = useRef<HTMLDivElement>(null);
    const testimonialsRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);
    const router = useRouter();

    const [isDark, setIsDark] = useState(false);
    const [showButtons, setShowButtons] = useState(false);
    const [isTestimonialsIntersecting, setIsTestimonialsIntersecting] = useState(false);
    const [animationsEnabled, setAnimationsEnabled] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [activeSection, setActiveSection] = useState<'home' | 'details' | null>('home');

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
                setIsTestimonialsIntersecting(entry.isIntersecting);
            },
            { threshold: 0 }
        );
        if (testimonialsRef.current) {
            observer.observe(testimonialsRef.current);
        }
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (walkthroughRef.current) {
                const detailsTop = walkthroughRef.current.offsetTop;
                setActiveSection(window.scrollY >= detailsTop ? 'details' : 'home');
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // call once to set initial
        return () => window.removeEventListener('scroll', handleScroll);
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

    const scrollToHome = () => {
        landingPageRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    };

    const scrollToDetails = () => {
        walkthroughRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    };

    const scrollToWalkthrough = () => {
        walkthroughRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    };

    const themeFolder = isDark ? 'dark' : 'light';

    return (
        <div className="flex flex-col">
            {!isMobile && (
                <nav className={`fixed top-4 right-4 z-20 bg-[var(--neutral-100)] z-20 border border-[var(--neutral-300)] rounded-lg shadow-lg`}>
                    <div className="px-4 py-2">
                        <ul className="flex space-x-4">
                            <li className="relative group">
                                <button onClick={scrollToHome} className="text-[var(--neutral-700)] hover:text-[var(--neutral-900)] transition-colors text-sm">
                                    Home
                                </button>
                                <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${activeSection === 'home' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}></div>
                            </li>
                            <li className="relative group">
                                <button onClick={scrollToDetails} className="text-[var(--neutral-700)] hover:text-[var(--neutral-900)] transition-colors text-sm">
                                    Details
                                </button>
                                <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${activeSection === 'details' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}></div>
                            </li>
                            <li>
                                <button onClick={() => router.push("/dashboard")} className="text-[var(--neutral-700)] hover:text-[var(--neutral-900)] transition-colors text-sm">
                                    Dashboard
                                </button>
                            </li>
                            <li>
                                <button onClick={() => router.push("/login?signup=true")} className="text-[var(--accent-500)] hover:text-[var(--accent-600)] transition-colors text-sm">
                                    Sign Up
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>
            )}
            {/* Hero Section */}
            <div
                ref={landingPageRef}
                className={`relative min-h-screen text-[var(--foreground)] ${animationsEnabled ? 'transition-all duration-500' : ''}`}
            >

                <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
                {animationsEnabled && <FlickeringGrid className="fixed inset-0 z-5" />}

                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 gap-3">
                    <Image src="/favicon.png" alt="Coi Logo" width={150} height={150} className="w-48 h-48" />

                    <h1 className="text-6xl font-bold t-[var(--neutral-900)] flex items-center gap-2">
                        Study Smarter,<br />Together.
                    </h1>

                    <p className="text-center text-3xl text-[var(--neutral-600)] max-w-xl mb-4">
                        Coi brings cards, projects, and collaboration into one interactive learning platform.
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
            </div>

            {/* Walkthrough Section */}
            <div
                ref={walkthroughRef}
                className="flex flex-col items-center bg-[var(--neutral-200)] text-[var(--foreground)] p-6 min-h-screen relative"
            >
                 <div className={`${isTestimonialsIntersecting ? "absolute w-full" : "fixed w-screen"} bottom-0 pb-4 p-6 transition-all duration-500 z-30 ${showButtons ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-full pointer-events-none'}`}>
                    <Buttons />
                </div>
                <WalkthroughComponent themeFolder={themeFolder} animationsEnabled={animationsEnabled} isMobile={isMobile} />
            </div>

            {/* Testimonials Section */}
            <div
                ref={testimonialsRef}
                className="flex flex-col items-center bg-[var(--neutral-100)] text-[var(--foreground)] p-6"
            >
                <Testimonials />
            </div>

            {/* Footer */}
            <Footer ref={footerRef} />
        </div>
    );
};

export default LandingPage;