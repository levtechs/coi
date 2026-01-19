"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import funFacts from "@/lib/fun-facts.json";

interface LoadingComponentProps {
    loadingText?: string;
    small?: boolean
}

const getDailyFact = () => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const randomIndex = dayOfYear % funFacts.length;
    return funFacts[randomIndex] as string;
};

const LoadingComponent = ({ loadingText, small} : LoadingComponentProps) => {
    const [dots, setDots] = useState("");
    const [randomFact] = useState(getDailyFact);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prevDots => {
                if (prevDots.length < 3) {
                    return prevDots + ".";
                }
                return "";
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex flex-col items-center justify-center ${small ? "" : "h-screen"} space-y-4 text-center max-w-md mx-auto px-4`}>
            <Image src="/square.gif" alt="Loading animation" width={100} height={100} />
            <div>
                <p className="text-[var(--foreground)] text-xl">{loadingText ? loadingText : "Loading"}{dots}</p>
                <p className="text-[var(--foreground)] text-sm opacity-60 mt-2 italic">{randomFact}</p>
            </div>
        </div>
    );
}

export default LoadingComponent;
