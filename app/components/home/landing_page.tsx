"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { FlickeringGrid } from "../../components/flickering-grid";

import HeroSection from "./hero_section";
import ProblemAgitation from "./problem_agitation";
import Transformation from "./transformation";
import Testimonials from "./testimonials_component";
import Features from "./features";
import AboutUs from "./about_us";
import Pricing from "./pricing";
import FAQ from "./faq";
import Footer from "./footer";

type SectionId = 'hero' | 'problem' | 'transformation' | 'testimonials' | 'features' | 'about' | 'pricing' | 'faq';

const LandingPage = () => {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<SectionId>('hero');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const heroRef = useRef<HTMLDivElement>(null);
    const problemRef = useRef<HTMLDivElement>(null);
    const transformationRef = useRef<HTMLDivElement>(null);
    const testimonialsRef = useRef<HTMLDivElement>(null);
    const featuresRef = useRef<HTMLDivElement>(null);
    const aboutRef = useRef<HTMLDivElement>(null);
    const pricingRef = useRef<HTMLDivElement>(null);
    const faqRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY + 100; // Offset for nav height

            const sections: { id: SectionId; ref: React.RefObject<HTMLDivElement | null> }[] = [
                { id: 'hero', ref: heroRef },
                { id: 'problem', ref: problemRef },
                { id: 'transformation', ref: transformationRef },
                { id: 'testimonials', ref: testimonialsRef },
                { id: 'features', ref: featuresRef },
                { id: 'about', ref: aboutRef },
                { id: 'pricing', ref: pricingRef },
                { id: 'faq', ref: faqRef }
            ];

            for (const section of sections) {
                const element = section.ref.current;
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const elementTop = rect.top + window.scrollY;
                    const elementBottom = elementTop + rect.height;

                    if (scrollY >= elementTop && scrollY < elementBottom) {
                        setActiveSection(section.id);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement | null>) => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="relative flex flex-col">
            {/* Background Flickering Grid */}
            <FlickeringGrid className="fixed inset-0 z-5" color="var(--neutral-400)" maxOpacity={0.2} />

            {/* Navigation */}
            <nav className="fixed top-4 right-4 z-30 bg-[var(--neutral-100)]/80 backdrop-blur-sm border border-[var(--neutral-300)] rounded-lg shadow-lg">
                <div className="px-4 py-2">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden flex justify-center items-center w-full text-[var(--neutral-700)] hover:text-[var(--neutral-900)] py-1 transition-transform duration-300"
                    >
                        {isMenuOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                    </button>
                    <ul className={`flex flex-col md:flex-row space-y-2 md:space-y-0 space-x-0 md:space-x-4 transition-all duration-300 ${isMenuOpen ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 md:opacity-100 md:max-h-96'} md:flex`}>
                        <li className="relative group">
                            <button
                                onClick={() => scrollToSection(heroRef)}
                                className={`text-sm transition-colors ${
                                    activeSection === 'hero'
                                        ? 'text-[var(--neutral-900)]'
                                        : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                                }`}
                            >
                                Home
                            </button>
                            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${
                                activeSection === 'hero' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            }`}></div>
                        </li>
                        <li className="relative group">
                            <button
                                onClick={() => scrollToSection(problemRef)}
                                className={`text-sm transition-colors ${
                                    activeSection === 'problem'
                                        ? 'text-[var(--neutral-900)]'
                                        : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                                }`}
                            >
                                Problem
                            </button>
                            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${
                                activeSection === 'problem' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            }`}></div>
                        </li>
                        <li className="relative group">
                            <button
                                onClick={() => scrollToSection(transformationRef)}
                                className={`text-sm transition-colors ${
                                    activeSection === 'transformation'
                                        ? 'text-[var(--neutral-900)]'
                                        : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                                }`}
                            >
                                Solution
                            </button>
                            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${
                                activeSection === 'transformation' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            }`}></div>
                        </li>
                        <li className="relative group">
                            <button
                                onClick={() => scrollToSection(testimonialsRef)}
                                className={`text-sm transition-colors ${
                                    activeSection === 'testimonials'
                                        ? 'text-[var(--neutral-900)]'
                                        : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                                }`}
                            >
                                Reviews
                            </button>
                            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${
                                activeSection === 'testimonials' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            }`}></div>
                        </li>
                        <li className="relative group">
                            <button
                                onClick={() => scrollToSection(featuresRef)}
                                className={`text-sm transition-colors ${
                                    activeSection === 'features'
                                        ? 'text-[var(--neutral-900)]'
                                        : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                                }`}
                            >
                                Features
                            </button>
                            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${
                                activeSection === 'features' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            }`}></div>
                        </li>
                        <li className="relative group">
                            <button
                                onClick={() => scrollToSection(aboutRef)}
                                className={`text-sm transition-colors ${
                                    activeSection === 'about'
                                        ? 'text-[var(--neutral-900)]'
                                        : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                                }`}
                            >
                                About
                            </button>
                            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${
                                activeSection === 'about' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            }`}></div>
                        </li>
                        {/*
                        <li className="relative group">
                            <button
                                onClick={() => scrollToSection(pricingRef)}
                                className={`text-sm transition-colors ${
                                    activeSection === 'pricing'
                                        ? 'text-[var(--neutral-900)]'
                                        : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                                }`}
                            >
                                Pricing
                            </button>
                            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${
                                activeSection === 'pricing' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            }`}></div>
                        </li>
                        */}
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

            {/* Content */}
            <div className="relative z-10">
                {/* Hero Section */}
                <div ref={heroRef}>
                    <HeroSection />
                </div>

                <hr className="border-[var(--neutral-300)]" />

                {/* Problem Agitation */}
                <div ref={problemRef}>
                    <ProblemAgitation />
                </div>

                <hr className="border-[var(--neutral-300)]" />

                {/* Transformation */}
                <div ref={transformationRef}>
                    <Transformation />
                </div>

                <hr className="border-[var(--neutral-300)]" />

                {/* Social Proof */}
                <div ref={testimonialsRef}>
                    <Testimonials />
                </div>

                <hr className="border-[var(--neutral-300)]" />

                {/* Features */}
                <div ref={featuresRef}>
                    <Features />
                </div>

                <hr className="border-[var(--neutral-300)]" />

                {/* About Us */}
                <div ref={aboutRef}>
                    <AboutUs />
                </div>

                <hr className="border-[var(--neutral-300)]" />

                {/* Pricing not yet implemneted */}
                {/*
                <div ref={pricingRef}>
                    <Pricing />
                </div>
                */}

                <hr className="border-[var(--neutral-300)]" />

                {/* FAQ */}
                <div ref={faqRef}>
                    <FAQ />
                </div>

                <hr className="border-[var(--neutral-300)]" />

                {/* Footer */}
                <Footer />
            </div>
        </div>
    );
};

export default LandingPage;
