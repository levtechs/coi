"use client";

import { useEffect, RefObject } from "react";

/**
 * Custom hook that triggers a callback when a click occurs outside the referenced element.
 * Only attaches the listener when `enabled` is true.
 *
 * @param ref - A ref to the element to detect outside clicks for.
 * @param handler - Callback to invoke on an outside click.
 * @param enabled - Whether the listener should be active (defaults to true).
 */
export const useOnClickOutside = (
    ref: RefObject<HTMLElement | null>,
    handler: () => void,
    enabled: boolean = true,
) => {
    useEffect(() => {
        if (!enabled) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                handler();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, handler, enabled]);
};
