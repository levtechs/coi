"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { FiCheck } from "react-icons/fi";

const Transformation = () => {
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
        <section className="py-20 bg-[var(--neutral-400)]/20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="relative">
                         <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                             <Image
                                 src={`/demos/${themeFolder}/notes.png`}
                                 alt="Coi AI tutor in action"
                                 width={600}
                                 height={450}
                                 className="w-full h-auto"
                             />
                             <Image
                                 src={`/demos/${themeFolder}/chat.png`}
                                 alt="Chat overlay"
                                 width={600}
                                 height={450}
                                 className="absolute bottom-0 right-0 w-3/4 h-auto rounded-lg shadow-xl transform rotate-3"
                             />
                         </div>
                        <div className="absolute -top-4 -left-4 bg-[var(--accent-500)] text-white rounded-lg px-4 py-2 font-semibold">
                            AI-Powered Learning
                        </div>
                    </div>

                    <div className="space-y-8">
                        <h2 className="text-4xl lg:text-5xl font-bold text-[var(--neutral-900)]">
                            Transform Your Study Experience
                        </h2>
                        <p className="text-xl text-[var(--neutral-600)]">
                            Coi combines adaptive AI tutoring, collaborative projects, and intelligent study tools to create a learning environment that actually works.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-[var(--accent-500)] rounded-full flex items-center justify-center">
                                    <FiCheck className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-[var(--neutral-900)] mb-2">
                                        Active Learning Techniques
                                    </h3>
                                    <p className="text-[var(--neutral-600)]">
                                        Spaced repetition, active recall, and adaptive questioning ensure you retain information efficiently.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-[var(--accent-500)] rounded-full flex items-center justify-center">
                                    <FiCheck className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-[var(--neutral-900)] mb-2">
                                        Collaborative Study Groups
                                    </h3>
                                    <p className="text-[var(--neutral-600)]">
                                        Share projects, discuss concepts, and learn from peers in real-time collaborative environments.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-[var(--accent-500)] rounded-full flex items-center justify-center">
                                    <FiCheck className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-[var(--neutral-900)] mb-2">
                                        Personalized AI Assistance
                                    </h3>
                                    <p className="text-[var(--neutral-600)]">
                                        An AI tutor that understands your course material and adapts explanations to your learning style.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Transformation;
