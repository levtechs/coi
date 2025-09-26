"use client";

import React, { useState, Dispatch, SetStateAction } from "react";
import { FiChevronRight, FiChevronDown, FiPlus } from "react-icons/fi";
import { Card, ContentHierarchy, ContentNode, ChatAttachment } from "@/lib/types";
import MarkdownArticle from "../md";
import DetailCard from "./cards/detail_card";

// Define the type for the global collapse state map
type CollapseStateMap = Record<string, boolean>;

// --- New Component: AddIcon (unchanged) ---
interface AddIconProps {
    onClick: () => void;
}

const AddIcon = React.memo(({ onClick }: AddIconProps) => {
    return (
        <div className="hidden group-hover:block absolute top-1 right-1 z-10">
            <FiPlus 
                className="text-3xl text-[var(--accent-400)] cursor-pointer"
                onClick={onClick}
            />
        </div>
    );
});
AddIcon.displayName = 'AddIcon';

// --- Hierarchy Renderer ---

interface ContentHierarchyRendererProps {
    hierarchy: ContentHierarchy;
    cards: Card[];
    setClickedCard: React.Dispatch<React.SetStateAction<Card | null>>;
    level: number;
    addAttachment: (attachment: ChatAttachment) => void;
    
    // NEW: Props for state management
    path: string; // The unique path of this node (e.g., "C/A")
    collapsedState: CollapseStateMap;
    toggleCollapse: (path: string) => void;
}

/**
 * Helper component that reads its collapse state from the parent-managed map.
 */
const HierarchicalNode = ({ 
    hierarchy, 
    cards, 
    setClickedCard, 
    level, 
    addAttachment,
    path, // Use path for unique identification
    collapsedState,
    toggleCollapse
}: ContentHierarchyRendererProps) => {
    
    // CRITICAL FIX: Read collapse state from the prop map, defaulting to expanded (false)
    const isCollapsed = !!collapsedState[path];
    
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
                                <AddIcon onClick={() => { addAttachment(card) }} />
                            </div>
                        ))}
                    </div>
                );
                cardBuffer = [];
            }
        };

        children.forEach((child, index) => {
            // Use index + type as a stable key for content that doesn't have an ID
            const stableKey = `${child.type}-${index}`;

            switch (child.type) {
                case "text":
                    flushCardBuffer();
                    elements.push(
                        <div 
                            className="group prose prose-sm max-w-none text-[var(--foreground)] relative p-2"
                            key={stableKey}
                        >
                            <MarkdownArticle markdown={child.text} />
                            <AddIcon onClick={() => { addAttachment(child) }} />
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
                            <div key={stableKey} className="text-[var(--neutral-500)] italic">
                                (Missing card: {child.cardId})
                            </div>
                        );
                    }
                    break;
                }

                case "subcontent":
                    flushCardBuffer();
                    
                    // Generate a new, unique path for the subcontent node
                    const childPath = `${path}/${child.content.title || `node-${index}`}`;

                    elements.push(
                        <div key={stableKey} className="ml-4">
                            <HierarchicalNode
                                hierarchy={child.content}
                                cards={cards}
                                setClickedCard={setClickedCard}
                                level={level < 5 ? level + 1 : 5}
                                addAttachment={addAttachment}
                                // Pass down the new path and the global state functions
                                path={childPath}
                                collapsedState={collapsedState}
                                toggleCollapse={toggleCollapse}
                            />
                        </div>
                    );
                    break;

                default:
                    flushCardBuffer();
                    break;
            }
        });

        flushCardBuffer();
        return elements;
    };

    return (
        <div className="flex flex-col">
            {hierarchy.title && (
                <div
                    // CRITICAL FIX: Call the global toggle function with this node's unique path
                    onClick={() => toggleCollapse(path)}
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

                    <div className="hidden group-hover:block absolute top-1 right-1 z-10">
                        <AddIcon onClick={() => { addAttachment(hierarchy) }} />
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

// --- Main Export Component ---

interface ContentPanelProps {
    hierarchy: ContentHierarchy | null;
    cards: Card[];
    hidden?: boolean;
    addAttachment: (attachment: ChatAttachment) => void;
    setClickedCard: Dispatch<SetStateAction<Card | null>>;
}

const ContentPanel = ({ hierarchy, cards, hidden = false, addAttachment, setClickedCard }: ContentPanelProps) => {
    // NEW: State to store the collapsed status of all nodes by their path
    const [collapsedState, setCollapsedState] = useState<CollapseStateMap>({});

    // Function to toggle the state of a node, preserving all others
    const toggleCollapse = (path: string) => {
        setCollapsedState(prev => {
            const isCurrentlyCollapsed = !!prev[path];
            return {
                ...prev,
                [path]: !isCurrentlyCollapsed,
            };
        });
    };

    // Generate the initial unique path for the root node
    const rootPath = hierarchy?.title || "root";
    
    return (
        <div className={`flex-1 w-full ${hidden ? "hidden" : ""}`}>
            <div className="relative p-3 rounded-md text-[var(--foreground)] bg-[var(--neutral-100)]">
                {hierarchy ? (
                    <HierarchicalNode 
                        hierarchy={hierarchy} 
                        cards={cards} 
                        setClickedCard={setClickedCard} 
                        addAttachment={addAttachment}
                        level={2}
                        // Pass global state props
                        path={rootPath}
                        collapsedState={collapsedState}
                        toggleCollapse={toggleCollapse}
                    />
                ) : (
                    <p className="text-[var(--neutral-500)]">(No content)</p>
                )}
            </div>
        </div>
    );
};

export default ContentPanel;