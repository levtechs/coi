"use client";

import React, { useState } from "react";

import { Card, Project, CardFilter } from "@/lib/types";

import { postCard } from "@/app/views/cards";

import DetailCard from "./detail_card";
import EditCardPopup from "./edit_card_popup";

type CardsPanelProps = {
    project: Project;
    onCardClick: (cardId: Card) => void;
    hidden: boolean;
    cardFilters: CardFilter;
};

export default function CardsPanel({ project, onCardClick, hidden, cardFilters }: CardsPanelProps) {
    const [isNewCardPopupOpen, setNewCardPopupOpen] = useState(false);

    const onAddCard = async (title: string, details: string[], exclude: boolean) => {
        // Post the new card to the backend
        await postCard(project.id, { title, details, exclude });
    };

        
    if (!project) {
        return (
            <div className={`text-[var(--neutral-600)] text-center p-8 ${hidden ? 'hidden' : ''}`}>
                Project not found.
            </div>
        );
    }

    const filteredCards = project.cards ? project.cards.filter(card => {
        const isResource = !!card.url;
        const hideKnowledge = cardFilters[0] === '0';
        const hideResource = cardFilters[1] === '0';
        return !((isResource && hideResource) || (!isResource && hideKnowledge));
    }) : [];

    return (
        <div className={`${hidden ? 'hidden' : ''}`}>
            {filteredCards.length === 0 ? (
                <>
                    {/* Create Project Card */}
                    <div
                        className="flex items-center justify-center border border-[var(--neutral-300)] rounded-lg p-6 cursor-pointer mt-8 mr-4
                            bg-[var(--neutral-100)]
                            hover:bg-[var(--neutral-300)]"
                        onClick={() => setNewCardPopupOpen(true)}
                    >
                        <span className="text-[var(--accent-500)] font-semibold text-lg">+ Create Card</span>
                    </div>
                </>
            ) : (
                <div className="flex flex-wrap w-full gap-8 p-4">
                    {/* Create Project Card */}
                    <div
                        className="flex items-center justify-center border border-[var(--neutral-300)] rounded-lg p-6 cursor-pointer
                                bg-[var(--neutral-100)]
                                hover:bg-[var(--neutral-300)]
                                transition-colors duration-200"
                        onClick={()=>{setNewCardPopupOpen(true)}}
                    >
                        <span className="text-[var(--accent-500)] font-semibold text-lg">+ Create Card</span>
                    </div>
                    {filteredCards.map((card) => (
                        <DetailCard key={card.id} card={card} onClick={onCardClick} projectId={project.id} />
                    ))}
                </div>
            )}
            {isNewCardPopupOpen && <EditCardPopup onSubmit={onAddCard} onCancel={() => setNewCardPopupOpen(false)}/>}
        </div>
    );
}
