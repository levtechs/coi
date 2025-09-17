"use client";

import React from "react";
import { Card, EmbedContent } from "@/lib/types";

import { FiX, FiYoutube } from "react-icons/fi";
import Image from "next/image";

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
                    <MarkdownArticle markdown={card.title} singleLine={true}/>
                </h2>

                {/* Card Details */}
                <div className="overflow-y-auto max-h-[70vh]">
                    <ul className="list-disc space-y-2 text-[var(--neutral-800)]">
                        {card.details && (Array.isArray(card.details) ? (
                            card.details.map((detail, index) => (
                                <li key={index} className="border-l-4 border-[var(--neutral-400)] pl-4">
                                    <MarkdownArticle markdown={detail} />
                                </li>
                            ))
                            ) : (
                                <div className="items-center flex justify-center"
                                    onClick={
                                        (card.details as EmbedContent)?.url
                                        ? () => window.open((card.details as EmbedContent).url)
                                        : () => {}
                                    }
                                >
                                    {card.details.thumbnail ? (
                                        <div className="relative">
                                            <img className="border-2 rounded-md" src={card.details.thumbnail} alt="Embed video"/>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <FiYoutube className="text-8xl text-[var(--error)]"/>
                                            </div>
                                        </div>
                                    ) : <p>No thumbnail found</p>}
                                </div>
                            ))
                        }
                    </ul>
                </div>
            </div>
        </div>
    );
}
