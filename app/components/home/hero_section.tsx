"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

const HeroSection = React.forwardRef<HTMLDivElement>((props, ref) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const themeFolder = isDark ? 'dark' : 'light';

    return (
        <section
            ref={ref}
            className="relative min-h-screen text-[var(--foreground)] bg-[var(--neutral-400)]/20"
        >
            <div className="fixed top-4 left-4 flex items-center gap-2 z-30 bg-[]/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
                <Image
                    src={`/logo.png`}
                    alt="Coi logo"
                    width={40}
                    height={40}
                />
                <span className="text-lg font-semibold text-[var(--neutral-900)]">Learn with Coi</span>
            </div>
            <div className="relative z-10 min-h-screen p-6 flex flex-col justify-center">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <h1 className="text-5xl lg:text-7xl font-bold text-[var(--neutral-900)] leading-tight">
                            Study Smarter,<br />Together.
                        </h1>
                        <p className="text-xl lg:text-2xl text-[var(--neutral-600)] max-w-2xl">
                            Coi brings cards, projects, and collaboration into one interactive learning platform that adapts to your study needs.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button className="bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors">
                                Get Started Free
                            </button>
                        </div>
                        <div className="bg-[var(--neutral-200)] rounded-lg p-4 border border-[var(--neutral-300)]">
                            <p className="text-[var(--neutral-700)] italic">
                                &ldquo;After using coi for my next test, I got an A.&rdquo; - Anonymous Student
                            </p>
                        </div>
                    </div>
                    <div className="relative top-10"> 
                        {/* 1. Move the logo OUTSIDE the overflow-hidden div */}
                        <Image
                            src={`/logo.png`}
                            alt="Coi logo"
                            width={1000}
                            height={1000}

                            className="absolute -top-80 left-20 opacity-100 z-0 hidden md:block" 
                        />

                        <div className="rounded-2xl overflow-hidden shadow-2xl">
                            <Image
                                src={`/demos/main_demo.gif`}
                                alt="Coi dashboard in action"
                                width={600}
                                height={450}
                                className="w-full h-auto relative z-10"
                                unoptimized
                            />
                        </div>

                        {/* Live Demo Tag */}
                        <div className="absolute -bottom-4 -right-4 bg-[var(--neutral-100)] rounded-lg shadow-lg p-3 border border-[var(--neutral-300)] z-20">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-[var(--accent-500)] rounded-full"></div>
                                <span className="text-sm font-medium text-[var(--neutral-700)]">Live Demo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
});

HeroSection.displayName = "HeroSection";

export default HeroSection;
