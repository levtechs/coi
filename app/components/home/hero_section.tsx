"use client";

import React from "react";
import { FiChevronDown } from "react-icons/fi";
import Image from "next/image";
import { FlickeringGrid } from "../../components/flickering-grid";
import Buttons from "./buttons";

interface HeroSectionProps {
    animationsEnabled: boolean;
    scrollToWalkthrough: () => void;
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
    ({ animationsEnabled, scrollToWalkthrough }, ref) => {
        return (
            <div
                ref={ref}
                className={`relative min-h-screen text-[var(--foreground)] ${animationsEnabled ? 'transition-all duration-500' : ''}`}
            >
                <div className="fixed inset-0 bg-[var(--neutral-100)] pointer-events-none"></div>
                {animationsEnabled && <FlickeringGrid className="fixed inset-0 z-5" />}
                <div className="relative z-10 min-h-screen p-6 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 flex-1">
                        <div className="flex flex-col justify-center items-center">
                            <Image src="/favicon.png" alt="Coi Logo" width={150} height={150} className="w-64 h-64 md:w-96 md:h-96" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-6xl font-bold text-[var(--neutral-900)] mb-4">
                                Study Smarter,<br />Together.
                            </h1>
                            <p className="text-3xl text-[var(--neutral-600)] mb-6 max-w-xl">
                                Coi brings cards, projects, and collaboration into one interactive learning platform.
                            </p>
                            <Buttons />
                            <p className="text-xl font-bold text-[var(--neutral-400)] mt-4">
                                Right now, it&apos;s 100% FREE!
                            </p>
                        </div>
                    </div>
                    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
                        <button className="flex flex-col items-center" onClick={scrollToWalkthrough}>
                            <div className={`text-sm font-semibold text-[var(--neutral-600)] ${animationsEnabled ? 'animate-bounce' : ''} flex items-center gap-1`}>
                                <FiChevronDown size={20} />
                                scroll for details
                                <FiChevronDown size={20} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
);

HeroSection.displayName = "HeroSection";

export default HeroSection;