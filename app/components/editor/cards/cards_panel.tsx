"use client";

import React, { useState } from "react";

import { Card, Project } from "@/lib/types";

import { postCard } from "@/app/views/cards";

import DetailCard from "./detail_card";
import NewCardPopup from "./new_card_popup";

type CardsPanelProps = {
    project: Project;
    onCardClick: (cardId: Card) => void;
    hidden: boolean;
};

export default function CardsPanel({ project, onCardClick, hidden }: CardsPanelProps) {
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

    return (
        <div className={`${hidden ? 'hidden' : ''}`}>
            {!project.cards || project.cards.length === 0 ? (
                <>
                    {/* Create Project Card */}
                    <div
                        className="flex items-center justify-center border border-[var(--neutral-300)] rounded-lg p-6 cursor-pointer mt-8 mr-4
                                bg-[var(--neutral-100)]
                                hover:bg-[var(--neutral-300)]
                                transition-colors duration-200"
                        onClick={()=>{setNewCardPopupOpen(true)}}
                    >
                        <span className="text-[var(--accent-500)] font-semibold text-lg">+ Create Card</span>
                    </div> 
                    <div className="text-[var(--neutral-600)] font-bold font-md text-center p-8">
                        No cards found for this project
                        <p className="font-light font-sm">
                            Start using the chat to automatically create cards, or create a new card manually.
                        </p>
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
                    {project.cards.map((card) => (
                        <DetailCard key={card.id} card={card} onClick={onCardClick} />
                    ))}
                </div>
            )}
            {isNewCardPopupOpen && <NewCardPopup onSubmit={onAddCard} onCancel={() => setNewCardPopupOpen(false)}/>}
        </div>
    );
}
