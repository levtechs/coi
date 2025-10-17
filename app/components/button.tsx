"use client";

import React from "react";

type ButtonProps = {
    color: string; // base color (CSS variable or hex)
    children: React.ReactNode;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    className?: string;
    disabled?: boolean;
};

export default function Button({ color, children, onClick, type = "button", className = "", disabled = false }: ButtonProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`rounded-md p-2 transition text-white hover:brightness-90 whitespace-nowrap ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
                backgroundColor: color,
            }}
        >
            {children}
        </button>
    );
}
