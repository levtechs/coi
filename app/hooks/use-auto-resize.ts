"use client";

import { useRef, useEffect, useCallback } from "react";

/**
 * Custom hook to handle textarea auto-resize based on content.
 * @param value The value of the textarea that triggers the resize.
 * @returns A ref to be attached to the textarea and a resize function.
 */
export const useAutoResize = (value: string) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const resize = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, []);

    useEffect(() => {
        resize();
    }, [value, resize]);

    return { textareaRef, resize };
};
