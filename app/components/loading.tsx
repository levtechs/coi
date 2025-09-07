"use client";

import { useState, useEffect } from "react";

interface LoadingComponentProps {
    loadingText?: string;
    small?: boolean
}

const LoadingComponent = ({ loadingText, small} : LoadingComponentProps) => {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prevDots => {
                if (prevDots.length < 3) {
                    return prevDots + ".";
                }
                return "";
            });
        }, 500); // Change dot every 500ms

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex flex-col items-center justify-center ${small ? "" : "h-screen"} space-y-4`}>
            <img src="/square.gif" alt="Loading animation" className="w-40 h-40" />
            <div>
                <p className="text-[var(--foreground)] text-xl">{loadingText ? loadingText : "Loading"}{dots}</p>
            </div>
        </div>
    );
}

export default LoadingComponent;
