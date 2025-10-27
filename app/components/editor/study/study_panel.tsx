"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/lib/types';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import StudyCard from './study_card';
import CardPopup from '../cards/card_popup';

const StudyPanel = ({ cards }: { cards: Card[] }) => {
    const [visibleCards, setVisibleCards] = useState<Card[]>(() => {
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    });
    const [currentSlot, setCurrentSlot] = useState(1);
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);

    const handleCardClick = (card: Card, position: number) => {
        if (position === 0) {
            setSelectedCard(card);
        } else if (position === -1) {
            setCurrentSlot(currentSlot - 1);
        } else if (position === 1) {
            next();
        }
    };

    const getRandomCard = useCallback(() => {
        const available = cards.filter(c => !visibleCards.some(v => v.id === c.id));
        const pool = available.length > 0 ? available : cards;
        return pool[Math.floor(Math.random() * pool.length)];
    }, [cards, visibleCards]);

    const next = () => {
        if (currentSlot + 1 < visibleCards.length) {
            setCurrentSlot(currentSlot + 1);
        } else {
            const newCard = getRandomCard();
            setVisibleCards([...visibleCards, newCard]);
            setCurrentSlot(currentSlot + 1);
        }
    };

    const prev = () => {
        if (currentSlot > 0) {
            setCurrentSlot(currentSlot - 1);
        } else {
            const newCard = getRandomCard();
            setVisibleCards([newCard, ...visibleCards]);
            setCurrentSlot(1);
        }
    };

    useEffect(() => {
        if (visibleCards.length - currentSlot < 3) {
            const toAdd = 3 - (visibleCards.length - currentSlot);
            const newCards = Array.from({ length: toAdd }, () => getRandomCard());
            setVisibleCards(prev => [...prev, ...newCards]);
        }
    }, [currentSlot, visibleCards.length, getRandomCard]);



    return (
        <div className="p-4">
            {cards.length > 0 ? (
                <div className="flex items-center justify-center gap-4 mb-4">
                    <button onClick={prev} className="text-2xl text-[var(--foreground)] hover:text-[var(--accent-500)]">
                        <FiChevronLeft />
                    </button>
                    <div className="flex gap-4">
                        {[-1, 0, 1].map((position) => {
                            const index = currentSlot + position;
                            const card = index >= 0 && index < visibleCards.length ? visibleCards[index] : null;
                            if (!card) return null;
                            const isCurrent = position === 0;
                            return (
                                <div
                                    key={position}
                                    className={`cursor-pointer w-64 flex-shrink-0 ${isCurrent ? 'scale-125' : 'scale-75'}`}
                                    onClick={() => {
                                        if (position === 0) setSelectedCard(card);
                                        else if (position === -1) setCurrentSlot(currentSlot - 1);
                                        else if (position === 1) next();
                                    }}
                                >
                                    <StudyCard card={card} onClick={() => {}} />
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={next} className="text-2xl text-[var(--foreground)] hover:text-[var(--accent-500)]">
                        <FiChevronRight />
                    </button>
                </div>
            ) : (
                <p className="text-[var(--foreground)]">No cards available.</p>
            )}
            {selectedCard && <CardPopup card={selectedCard} onClose={() => setSelectedCard(null)} />}
        </div>
    );
};

export default StudyPanel;
