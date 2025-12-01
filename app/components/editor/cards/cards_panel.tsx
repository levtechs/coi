"use client";

import React, { useState } from "react";

import { Card, Project, CardFilter, Label } from "@/lib/types";
import { LABEL_DEFINITIONS } from "@/lib/labels";

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
    const lessonCardIds = new Set(project.courseLesson?.cardsToUnlock.map(c => c.id) || []);
    const [isNewCardPopupOpen, setNewCardPopupOpen] = useState(false);
    const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);

    const onAddCard = async (title: string, details: string[], exclude: boolean, labels: Label[]) => {
        // Post new card to backend
        await postCard(project.id, { title, details, exclude, labels });
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
        const hasImportantLabel = card.labels?.includes("important");
        
        // Filter by selected labels
        const hasSelectedLabel = selectedLabels.length === 0 || 
            (card.labels && selectedLabels.some(label => card.labels!.includes(label)));
        
        return (
            (isResource ? cardFilters.resource : cardFilters.knowledge) &&
            (!hasImportantLabel || cardFilters.important) &&
            hasSelectedLabel
        );
    }) : [];

    const toggleLabel = (label: Label) => {
        if (selectedLabels.includes(label)) {
            setSelectedLabels(selectedLabels.filter(l => l !== label));
        } else {
            setSelectedLabels([...selectedLabels, label]);
        }
    };

    return (
        <div className={`${hidden ? 'hidden' : ''}`}>
            {/* Label Filter */}
            {project.cards && project.cards.length > 0 && (
                <div className="p-4 border-b border-[var(--neutral-300)]">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--neutral-400)]">Filter by Labels:</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                className={`px-3 py-2 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${
                                    selectedLabels.length === 0
                                        ? 'bg-[var(--neutral-400)] text-[var(--foreground)]'
                                        : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'
                                }`}
                                onClick={() => setSelectedLabels([])}
                            >
                                All Cards
                            </button>
                            {LABEL_DEFINITIONS.map((labelDef) => {
                                const Icon = labelDef.icon;
                                const isSelected = selectedLabels.includes(labelDef.id);
                                const count = project.cards!.filter(card => 
                                    card.labels?.includes(labelDef.id)
                                ).length;
                                
                                return (
                                    <button
                                        key={labelDef.id}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${
                                            isSelected
                                                ? 'bg-[var(--neutral-400)] text-[var(--foreground)]'
                                                : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'
                                        }`}
                                        onClick={() => toggleLabel(labelDef.id)}
                                        title={`${labelDef.name} (${count} cards)`}
                                    >
                                        <Icon size={16} />
                                        <span>{labelDef.name}</span>
                                        {count > 0 && (
                                            <span className="ml-1 text-xs bg-[var(--neutral-300)] px-1 rounded">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            {filteredCards.length === 0 ? (
                <>
                    <p className="text-[var(--neutral-500)] text-center p-4">Blank project, start using chat to see the cards populate, or create a card manually.</p>
                    {/* Create Project Card */}
                    <div
                        className="flex items-center justify-center border border-[var(--neutral-300)] rounded-lg p-6 cursor-pointer mt-4 mr-4
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
                        <DetailCard key={card.id} card={card} onClick={onCardClick} projectId={project.id} isLessonCard={lessonCardIds.has(card.id)} />
                    ))}
                </div>
            )}
            {isNewCardPopupOpen && <EditCardPopup onSubmit={onAddCard} onCancel={() => setNewCardPopupOpen(false)}/>}
        </div>
    );
}
