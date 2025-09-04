"use client";

import React from "react";
import { Card, Project } from "@/lib/types";
import DetailCard from "./detail_card";

type CardsPanelProps = {
    project: Project;
    onCardClick: (cardId: Card) => void;
};

export default function CardsPanel({ project, onCardClick }: CardsPanelProps) {
    if (!project || !project.cards || project.cards.length === 0) {
        return (
            <div className="text-[var(--neutral-600)] text-center p-8">
                No cards found for this project.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 min-h-[75vh]">
            {project.cards.map((card) => (
                <DetailCard key={card.id} card={card} onClick={onCardClick} />
            ))}
        </div>
    );
}
