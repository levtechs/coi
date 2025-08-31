"use client";

import React from "react";

type ButtonProps = {
    color: string; // base color (CSS variable or hex)
    children: React.ReactNode;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    className?: string;
};

export default function Button({ color, children, onClick, type = "button", className = "" }: ButtonProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            className={`rounded-md p-2 transition text-white hover:brightness-90 ${className}`}
            style={{
                backgroundColor: color,
            }}
        >
            {children}
        </button>
    );
}
