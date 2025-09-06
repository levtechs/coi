"use client";

import React from "react";
import { Card, Project } from "@/lib/types";
import DetailCard from "./detail_card";

type CardsPanelProps = {
    project: Project;
    onCardClick: (cardId: Card) => void;
    hidden: boolean;
};

export default function CardsPanel({ project, onCardClick, hidden }: CardsPanelProps) {
    if (!project || !project.cards || project.cards.length === 0) {
        return (
            <div className={`text-[var(--neutral-600)] text-center p-8 ${hidden ? 'hidden' : ''}`}>
                No cards found for this project.
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap w-full gap-8 p-4 ${hidden ? 'hidden' : ''}`}>
            {project.cards.map((card) => (
                <DetailCard key={card.id} card={card} onClick={onCardClick} />
            ))}
        </div>
    );
}
