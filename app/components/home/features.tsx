"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { FiBookOpen, FiZap, FiUsers, FiFolder } from "react-icons/fi";

const Features = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const themeFolder = isDark ? 'dark' : 'light';

    const features = [
        {
            icon: FiBookOpen,
            title: "Intelligent Study Tools",
            description: "Transform your learning with smart, automated study aids that adapt to your needs.",
            subBenefits: [
                "Auto-generated flashcards with relevant information and resources",
                "Organized note hierarchies curated as you learn",
                "Custom quizzes that test your knowledge effectively"
            ],
            visual: `/demos/${themeFolder}/card1.png`,
            alt: "Study cards interface"
        },
        {
            icon: FiZap,
            title: "AI-Powered Learning",
            description: "Get personalized assistance from an adaptive AI tutor that understands your learning style.",
            subBenefits: [
                "Conversational AI that explains concepts in your preferred way",
                "Adaptive questioning based on your progress",
                "Instant answers to complex questions about your material"
            ],
            visual: `/demos/${themeFolder}/chat.png`,
            alt: "AI chat interface"
        },
        {
            icon: FiUsers,
            title: "Collaborative Study Groups",
            description: "Learn together with peers through shared projects and group discussions.",
            subBenefits: [
                "Create and share study projects with classmates",
                "Real-time collaboration on notes and materials",
                "Peer discussions and knowledge sharing"
            ],
            visual: `/demos/${themeFolder}/dashboard.png`,
            alt: "Dashboard with projects"
        },
        {
            icon: FiFolder,
            title: "Complete Course Management",
            description: "Access pre-built courses and organize your entire learning journey.",
            subBenefits: [
                "Explore comprehensive courses with full lesson plans",
                "Track progress across multiple subjects",
                "Organized learning paths for structured study"
            ],
            visual: `/demos/${themeFolder}/course.png`,
            alt: "Course interface"
        }
    ];

    return (
        <section className="py-20 bg-[var(--neutral-400)]/20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold text-[var(--neutral-900)] mb-6">
                        Everything You Need to Study Smarter
                    </h2>
                    <p className="text-xl text-[var(--neutral-600)] max-w-3xl mx-auto">
                        Coi combines cutting-edge AI with proven learning techniques to create the ultimate study platform.
                    </p>
                </div>

                <div className="space-y-20">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                                index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                            }`}
                        >
                            <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[var(--accent-500)] rounded-lg flex items-center justify-center">
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-[var(--neutral-900)]">
                                        {feature.title}
                                    </h3>
                                </div>

                                <p className="text-lg text-[var(--neutral-600)]">
                                    {feature.description}
                                </p>

                                <ul className="space-y-3">
                                    {feature.subBenefits.map((benefit, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="w-2 h-2 bg-[var(--accent-500)] rounded-full mt-2 flex-shrink-0"></div>
                                            <span className="text-[var(--neutral-700)]">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className={`relative ${index % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                                    <Image
                                        src={feature.visual}
                                        alt={feature.alt}
                                        width={500}
                                        height={375}
                                        className="w-full h-auto"
                                    />
                                     {feature.title === "Intelligent Study Tools" && (
                                         <Image
                                             src={`/demos/${themeFolder}/card2.png`}
                                             alt="Study cards overlay"
                                             width={500}
                                             height={375}
                                             className="absolute bottom-4 right-4 w-3/4 h-auto rounded-lg shadow-xl transform rotate-2"
                                         />
                                     )}
                                     {feature.title === "AI-Powered Learning" && (
                                         <Image
                                             src={`/demos/${themeFolder}/quiz.png`}
                                             alt="Quiz overlay"
                                             width={500}
                                             height={375}
                                             className="absolute bottom-4 right-4 w-3/4 h-auto rounded-lg shadow-xl transform rotate-3"
                                         />
                                     )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
