"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import Button from "../button";
import WalkthroughComponent from "./walkthrough";
import Testimonials from "./testimonials_component";
import Footer from "./footer";
import HeroSection from "./hero_section";

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
        setShowButtons(activeSection === 'details');
    }, [activeSection]);

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
            <HeroSection ref={landingPageRef} animationsEnabled={animationsEnabled} scrollToWalkthrough={scrollToWalkthrough} />

            {/* Walkthrough Section */}
            <div
                ref={walkthroughRef}
                className="flex flex-col items-center bg-[var(--neutral-200)] text-[var(--foreground)] p-6 min-h-screen relative"
            >
                  <div className={`${isTestimonialsIntersecting ? "absolute w-full" : "fixed w-screen"} bottom-0 pb-4 p-6 transition-all duration-500 z-30 ${showButtons ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-full pointer-events-none'}`}>
                      <div className="flex justify-center">
                          <div className="z-40 flex flex-col md:flex-row justify-center gap-4 mt-4">
                              <Button color="var(--neutral-500)" onClick={() => router.push("/dashboard")} className="flex-1 md:flex-none px-0 py-3 md:px-6 md:py-3 md:text-lg">
                                  Go to Dashboard
                              </Button>
                              <Button color="var(--accent-500)" onClick={() => router.push("/login?signup=true")} className="flex-1 md:flex-none px-0 py-3 md:px-6 md:py-3 md:text-lg">
                                  Get Started
                              </Button>
                          </div>
                      </div>
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
