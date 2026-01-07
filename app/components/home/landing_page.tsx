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

    const navItems = [
        { id: 'hero' as SectionId, label: 'Home', ref: heroRef },
        { id: 'problem' as SectionId, label: 'Problem', ref: problemRef },
        { id: 'transformation' as SectionId, label: 'Solution', ref: transformationRef },
        { id: 'testimonials' as SectionId, label: 'Reviews', ref: testimonialsRef },
        { id: 'features' as SectionId, label: 'Features', ref: featuresRef },
        { id: 'about' as SectionId, label: 'About', ref: aboutRef },
        /* { id: 'pricing' as SectionId, label: 'Pricing', ref: pricingRef }, */
    ];

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY + 100; // Offset for nav height

            const sections: { id: SectionId; ref: React.RefObject<HTMLDivElement | null> }[] = navItems.map(item => ({
                id: item.id,
                ref: { hero: heroRef, problem: problemRef, transformation: transformationRef, testimonials: testimonialsRef, features: featuresRef, about: aboutRef, pricing: pricingRef, faq: faqRef }[item.id] || null
            }));

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
                        {navItems.map(({ id, label, ref }) => (
                            <li key={id} className="relative group">
                                <button
                                    onClick={() => scrollToSection(ref)}
                                    className={`text-sm transition-colors ${
                                        activeSection === id
                                            ? 'text-[var(--neutral-900)]'
                                            : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                                    }`}
                                >
                                    {label}
                                </button>
                                <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current transition-opacity ${
                                    activeSection === id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                                }`}></div>
                            </li>
                        ))}
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
                    <HeroSection onScrollDown={() => scrollToSection(problemRef)} />
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
