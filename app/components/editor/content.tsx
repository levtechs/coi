"use client";

import React, { useState, Dispatch, SetStateAction } from "react";

import { FiChevronRight, FiChevronDown, FiPlus } from "react-icons/fi";

import { Card, ContentHierarchy, ContentNode, ChatAttachment } from "@/lib/types";

import MarkdownArticle from "../md";
import DetailCard from "./cards/detail_card";

interface ContentHierarchyRendererProps {
    hierarchy: ContentHierarchy;
    cards: Card[];
    setClickedCard: React.Dispatch<React.SetStateAction<Card | null>>
    level?: number;
    addAttachment: (attachment: ChatAttachment) => void;
}

const ContentHierarchyRenderer = ({ hierarchy, cards, setClickedCard, level = 2, addAttachment }: ContentHierarchyRendererProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!hierarchy) return <p className="text-[var(--neutral-500)]">(No content)</p>;

    const headingSize = level > 5 ? 5 : level;
    const headingClass = `text-${2 + (5 - headingSize)}xl font-semibold`;

    // Function to render children with consecutive cards in a row
    const renderChildren = (children: ContentNode[]) => {
        const elements: React.ReactNode[] = [];
        let cardBuffer: Card[] = [];

        const flushCardBuffer = () => {
            if (cardBuffer.length > 0) {
                const rowKey = cardBuffer.map(c => c.id).join("-");
                elements.push(
                    <div key={`row-${rowKey}`} className="flex flex-row gap-4 p-2 overflow-x-auto">
                        {cardBuffer.map((card) => (
                            <div key={card.id} className="group shrink-0 relative">
                                <DetailCard card={card} onClick={() => setClickedCard(card)} />
                                <AddIcon onClick={()=>{addAttachment(card)}} />
                            </div>
                        ))}
                    </div>
                );
                cardBuffer = [];
            }
        };

        children.forEach((child) => {
            switch (child.type) {
                case "text":
                    flushCardBuffer();
                    elements.push(
                        <div 
                            className="group prose prose-sm max-w-none text-[var(--foreground)] relative p-2"
                            key={crypto.randomUUID().toString()} 
                        >
                            <MarkdownArticle markdown={child.text} />
                            <AddIcon onClick={()=>{addAttachment(child)}} />
                        </div>
                    );
                    break;

                case "card": {
                    const card = cards.find((c) => c.id === child.cardId);
                    if (card) {
                        cardBuffer.push(card);
                    } else {
                        flushCardBuffer();
                        elements.push(
                            <div key={crypto.randomUUID().toString()} className="text-[var(--neutral-500)] italic">
                                (Missing card: {child.cardId})
                            </div>
                        );
                    }
                    break;
                }

                case "subcontent":
                    flushCardBuffer();
                    elements.push(
                        <div key={crypto.randomUUID().toString()} className="ml-4">
                            <ContentHierarchyRenderer
                                hierarchy={child.content}
                                cards={cards}
                                setClickedCard={setClickedCard}
                                level={level < 5 ? level + 1 : 5}
                                addAttachment={addAttachment}
                            />
                        </div>
                    );
                    break;

                default:
                    flushCardBuffer();
                    break;
            }
        });

        flushCardBuffer(); // flush any remaining cards at the end
        return elements;
    };

    return (
        <div className="flex flex-col">
            {hierarchy.title && (
                <div
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="group flex items-center gap-2 cursor-pointer mb-2 relative"
                >
                    {isCollapsed ? (
                        <FiChevronRight className="text-[var(--neutral-500)]" size={24} />
                    ) : (
                        <FiChevronDown className="text-[var(--neutral-500)]" size={24} />
                    )}
                    {React.createElement(
                        `h${headingSize}`,
                        {
                            className: `text-[var(--foreground)] ${headingClass}`,
                        },
                        <MarkdownArticle markdown={hierarchy.title} />
                    )}

                    {/* Hover icon scoped to just the header row */}
                    <div className="hidden group-hover:block absolute top-1 right-1">
                        <AddIcon onClick={() => {addAttachment(hierarchy)}} />
                    </div>
                </div>
            )}

            {!isCollapsed && (
                <div className="ml-4 space-y-4">
                    {renderChildren(hierarchy.children)}
                </div>
            )}
        </div>
    );
};

interface ContentPanelProps {
    hierarchy: ContentHierarchy | null;
    cards: Card[];
    hidden?: boolean;
    addAttachment: (attachment: ChatAttachment) => void;
    setClickedCard: Dispatch<SetStateAction<Card | null>>;
}

const ContentPanel = ({ hierarchy, cards, hidden = false, addAttachment, setClickedCard}: ContentPanelProps) => {

    return (
        <div className={`flex-1 w-full ${hidden ? "hidden" : ""}`}>
            <div className="relative p-3 rounded-md text-[var(--foreground)] bg-[var(--neutral-100)]">
                {hierarchy ? (
                    <ContentHierarchyRenderer hierarchy={hierarchy} cards={cards} setClickedCard={setClickedCard} addAttachment={addAttachment}/>
                ) : (
                    <p className="text-[var(--neutral-500)]">(No content)</p>
                )}
            </div>
        </div>
    );
};

export default ContentPanel;

interface AddIconProps {
    onClick: () => void;
}

const AddIcon = ({ onClick }: AddIconProps) => {
    return (
        <div className="hidden group-hover:block absolute top-1 right-1">
            <FiPlus 
                className="text-3xl text-[var(--accent-400)] cursor-pointer"
                onClick={onClick}
            />
        </div>
    )
}