"use client";

import React from "react";
import { Card } from "@/lib/types";
import Image from "next/image";
import MarkdownArticle from "../../md";

import { FaYoutube } from "react-icons/fa";
import { FiStar } from "react-icons/fi";

type StudyCardProps = {
    card: Card;
    onClick: (card: Card) => void;
};

export default function StudyCard({ card, onClick }: StudyCardProps) {
    const displayTitle = card.title;

    return (
        <div
            className="flex items-center justify-center text-center relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] h-32 shadow hover:shadow-md transition cursor-pointer group"
            onClick={() => onClick(card)}
        >
            {card.isUnlocked && (
                <FiStar className="absolute top-2 left-2 text-[var(--accent-500)] w-5 h-5" />
            )}
            {card.url && (card.url.includes("youtube.com") || card.url.includes("youtu.be")) ? (
                <FaYoutube className="w-6 h-6 mr-2 text-[var(--error)] flex-shrink-0" />
            ) : (
                card.iconUrl && (
                    <Image
                        src={card.iconUrl}
                        alt="Favicon"
                        width={24}
                        height={24}
                        className="w-6 h-6 mr-2 rounded-sm flex-shrink-0"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )
            )}
            <h3 className="text-[var(--foreground)] font-semibold text-xl">
                <MarkdownArticle markdown={displayTitle} singleLine={false} />
            </h3>
        </div>
    );
};