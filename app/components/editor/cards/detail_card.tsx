"use client";

import React from "react";
import { Card } from "@/lib/types";
import MarkdownArticle from "../../md";

import { FaYoutube } from "react-icons/fa";

type DetailCardProps = {
    card: Card;
    onClick: (card: Card) => void;
};

export default function DetailCard({ card, onClick }: DetailCardProps) {
    const displayTitle = card.title.length > 20 ? card.title.slice(0, 27) + "..." : card.title;
    return (
        <div
            className="flex items-center justify-center text-center relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] h-24 shadow hover:shadow-md transition cursor-pointer group"
            onClick={() => onClick(card)}
        >
            {card.url && (card.url.includes("youtube.com") || card.url.includes("youtu.be")) ? (
                <FaYoutube className="w-6 h-6 mr-2 text-[var(--error)] flex-shrink-0" />
            ) : (
                card.iconUrl && (
                    <img
                        src={card.iconUrl}
                        alt="Favicon"
                        className="w-6 h-6 mr-2 rounded-sm flex-shrink-0"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )
            )}
            <h3 className="text-[var(--foreground)] font-semibold text-xl">
                <MarkdownArticle markdown={displayTitle} singleLine={true} />
            </h3>
        </div>
    );
}
