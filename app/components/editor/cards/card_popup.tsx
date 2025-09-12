"use client";

import React from "react";
import { Card } from "@/lib/types";

import { FiX } from "react-icons/fi";

import MarkdownArticle from "../../md";

type CardPopupProps = {
    card: Card;
    onClose: () => void;
};

export default function CardPopup({ card, onClose }: CardPopupProps) {
    return (
        // Full-screen overlay with blur and dimming effect that closes on click
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50"
            onClick={onClose}
        >
            {/* Modal content container - stop click events from bubbling up */}
            <div 
                className="relative bg-[var(--neutral-100)] p-8 rounded-lg shadow-lg w-full max-w-2xl mx-4 sm:mx-0 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[var(--neutral-700)] hover:text-[var(--accent-500)] transition-colors"
                    aria-label="Close"
                >
                    <FiX size={24} />
                </button>

                {/* Card Title */}
                <h2 className="text-[var(--foreground)] font-bold text-3xl text-center mb-4">
                    <MarkdownArticle markdown={card.title} />
                </h2>

                {/* Card Details */}
                <div className="overflow-y-auto max-h-[70vh]">
                    <ul className="list-disc space-y-2 text-[var(--neutral-800)]">
                        {card.details && card.details.map((detail, index) => (
                            <li key={index} className="border-l-4 border-[var(--neutral-400)] pl-4">
                                <MarkdownArticle markdown={detail} />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
