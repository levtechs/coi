"use client";

import React from "react";
import { Card } from "@/lib/types";
import MarkdownArticle from "../../md";

type DetailCardProps = {
    card: Card;
    onClick: (card: Card) => void;
};

export default function DetailCard({ card, onClick }: DetailCardProps) {
    return (
        <div
            className="flex items-center justify-center text-center relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] h-24 shadow hover:shadow-md transition cursor-pointer group"
            onClick={() => onClick(card)}
        >
            <h3 className="text-[var(--foreground)] font-semibold text-xl">
                <MarkdownArticle markdown={card.title} />
            </h3>
        </div>
    );
}
