"use client";

import { useState, useEffect } from "react";

/**
 * A hook that progressively reveals text to smooth out large chunks of incoming data.
 * Useful for chat streams where large packets of tokens arrive at once.
 */
export function useSmoothStream(text: string, isEnabled: boolean = true) {
    const [displayedText, setDisplayedText] = useState(text);
    
    // Ref to track if we've already synced with the current text length to avoid
    // unnecessary effect runs or jitters on hydration.
    // However, simple length check in effect is robust enough.

    // Handle disabling or initial mount with full text (if passed as initial state)
    // We used useState(text) so initial mount is handled.
    // If isEnabled is toggled off, we want to snap to full text.
    useEffect(() => {
        if (!isEnabled && displayedText !== text) {
            setDisplayedText(text);
        }
    }, [isEnabled, text, displayedText]);

    useEffect(() => {
        if (!isEnabled) return;

        // If text shrunk (e.g. deletion/correction), snap immediately to avoid "typing backwards"
        if (text.length < displayedText.length) {
            setDisplayedText(text);
            return;
        }

        // If we have caught up, do nothing
        if (displayedText.length === text.length) return;

        // Schedule the next frame update
        const timeoutId = requestAnimationFrame(() => {
            setDisplayedText((current) => {
                // Double check inside callback to be safe
                if (current.length >= text.length) return current;

                const queue = text.length - current.length;

                // If massive jump (e.g. initial load of long history), snap to end
                // This prevents waiting 10 seconds for a loaded chat to "type out"
                if (queue > 1000) {
                    return text;
                }

                // Variable speed: catch up faster if the queue is large.
                // Divisor 20 means it tries to close the gap in ~20 frames (~300ms).
                // Min 1 char per frame ensures we eventually finish.
                // Max 50 chars per frame caps the speed so it doesn't jump too wildly on huge chunks.
                const increment = Math.min(50, Math.max(1, Math.floor(queue / 20)));
                
                return text.slice(0, current.length + increment);
            });
        });

        return () => cancelAnimationFrame(timeoutId);
    }, [text, isEnabled, displayedText]);

    return displayedText;
}
