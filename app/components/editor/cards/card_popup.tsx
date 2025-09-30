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
    const truncatedTitle = card.title.length > 50 ? card.title.slice(0, 47) + '...' : card.title;

    const isYoutube = card.url && (card.url.includes('youtube.com') || card.url.includes('youtu.be'));
    const videoId = isYoutube ? card.url!.match(/[?&]v=([^#\&\?]*)/)?.[1] : null;

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

                <div className="flex flex-row items-center justify-center overflow-hidden">
                    {card.iconUrl && (
                        <img
                            src={card.iconUrl}
                            alt="Favicon"
                            className="w-6 h-6 mr-2 rounded-sm flex-shrink-0"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    )}

                     {/* Card Title */}
                     <h2 className="text-[var(--foreground)] font-bold text-3xl truncate">
                         <MarkdownArticle markdown={truncatedTitle} />
                     </h2>
                </div>

                {/* Card Contents */}
                <div className="overflow-y-auto max-h-[70vh]">

                    {/* Images or YouTube Embed */}
                    {isYoutube && videoId ? (
                        <div className="w-full">
                            <iframe
                                width="100%"
                                height="315"
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="rounded-lg"
                            ></iframe>
                        </div>
                    ) : (
                        card.refImageUrls && card.refImageUrls.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                {card.refImageUrls.map((url, index) => (
                                    <img
                                        key={index}
                                        src={url}
                                        alt={`Reference image ${index + 1}`}
                                        className="w-full h-auto rounded-lg object-scale-down"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ))}
                            </div>
                        )
                    )}

                    {/* Ref url */}
                    {card.url && (
                        <p
                            className="cursor-pointer text-blue-500 underline mt-4 text-center"
                            onClick={() => window.open(card.url, '_blank')}
                        >
                            {card.url.length > 50 ? card.url.slice(0, 47) + "..." : card.url}
                        </p>
                    )}

                    {/* Details */}
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
