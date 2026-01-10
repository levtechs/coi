"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, Label } from "@/lib/types";
import MarkdownArticle from "../../md";

import { FaYoutube } from "react-icons/fa";
import { FiEdit2, FiMoreVertical, FiTrash2, FiStar, FiCheckSquare, FiSquare } from "react-icons/fi";
import { deleteCard, updateCard } from "@/app/views/cards";
import EditCardPopup from "./edit_card_popup";
import { getLabelDefinition, LABEL_DEFINITIONS } from "@/lib/labels";

type DetailCardProps = {
    card: Card;
    onClick: (card: Card) => void;
    projectId?: string;
    useCheckbox?: boolean;
};

export default function DetailCard({ card, onClick, projectId, useCheckbox }: DetailCardProps) {
    const showMenu = !!projectId && !card.isUnlocked;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    const toggleLabel = async (labelId: Label) => {
        if (!projectId) return;
        
        const currentLabels = card.labels || [];
        const newLabels = currentLabels.includes(labelId)
            ? currentLabels.filter(l => l !== labelId)
            : [...currentLabels, labelId];
        
        await updateCard(projectId, card.id, { labels: newLabels });
    };

    const displayTitle = card.title.length > 20 ? card.title.slice(0, 27) + "..." : card.title;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    return (
        <>
        <div
            className="flex items-center justify-start text-left relative border border-[var(--neutral-300)] rounded-lg p-6 bg-[var(--neutral-200)] h-24 shadow hover:shadow-md transition cursor-pointer group"
            onClick={() => onClick(card)}
        >
            {useCheckbox ? (
                card.isUnlocked ? (
                    <FiCheckSquare className="absolute top-2 left-2 text-[var(--accent-500)] w-5 h-5" />
                ) : (
                    <FiSquare className="absolute top-2 left-2 text-[var(--neutral-500)] w-5 h-5" />
                )
            ) : (
                card.isUnlocked && (
                    <FiStar className="absolute top-2 left-2 text-[var(--accent-500)] w-5 h-5" />
                )
            )}
            {card.url && (card.url.includes("youtube.com") || card.url.includes("youtu.be")) ? (
                <FaYoutube className="w-6 h-6 mr-2 text-[var(--error)] flex-shrink-0" />
            ) : (
                card.iconUrl && (
                    <img
                        src={card.iconUrl}
                        alt="Favicon"
                        className="w-6 h-6 mr-2 rounded-sm flex-shrink-0"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )
            )}
             <h3 className="text-[var(--foreground)] font-semibold text-xl">
                 <MarkdownArticle markdown={displayTitle} singleLine={true} />
             </h3>

            {/* Label Badges - Show all on hover */}
            <div className="absolute bottom-2 left-2 flex gap-1">
                {/* Always show selected labels */}
                {card.labels && card.labels.map((labelId) => {
                    const labelDef = getLabelDefinition(labelId);
                    if (!labelDef) return null;
                    const Icon = labelDef.icon;
                    
                    return (
                        <div
                            key={labelId}
                            className="rounded-full p-1.5 bg-[var(--neutral-200)] border border-[var(--neutral-300)] cursor-pointer hover:bg-[var(--neutral-300)] transition-colors duration-200"
                            title={labelDef.name}
                            onClick={async (e) => {
                                e.stopPropagation();
                                await toggleLabel(labelId);
                            }}
                        >
                            <Icon size={12} className="text-[var(--neutral-700)]" />
                        </div>
                    );
                })}
                
                {/* Show unselected labels on hover */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {LABEL_DEFINITIONS.filter(labelDef => !card.labels?.includes(labelDef.id)).map((labelDef) => {
                        const Icon = labelDef.icon;
                        
                        return (
                            <div
                                key={labelDef.id}
                                className="rounded-full p-1.5 bg-[var(--neutral-100)] border border-[var(--neutral-200)] cursor-pointer hover:bg-[var(--neutral-200)] transition-colors duration-200"
                                title={labelDef.name}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    await toggleLabel(labelDef.id);
                                }}
                            >
                                <Icon size={12} className="text-[var(--neutral-500)]" />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Three Dots Icon */}
            {showMenu && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition" ref={buttonRef}>
                    <FiMoreVertical
                        className="text-[var(--neutral-700)] cursor-pointer hover:text-[var(--accent-500)]"
                        size={20}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isMenuOpen && buttonRef.current) {
                                const rect = buttonRef.current.getBoundingClientRect();
                                setMenuPosition({ top: rect.bottom + window.scrollY, left: rect.right - 128 + window.scrollX });
                            }
                            setIsMenuOpen(!isMenuOpen);
                        }}
                    />
                </div>
            )}

        </div>
        {projectId && (
            <>
                <MenuDropdown isOpen={isMenuOpen} position={menuPosition} onClose={() => setIsMenuOpen(false)} menuRef={menuRef} projectId={projectId} card={card} onEdit={() => setIsEditPopupOpen(true)} />
                {isEditPopupOpen && (
                    <EditCardPopup
                        card={card}
                        onSubmit={async (title, details, exclude, labels, cardId) => {
                            if (cardId) {
                                await updateCard(projectId, cardId, { title, details, exclude, labels });
                            }
                        }}
                        onCancel={() => setIsEditPopupOpen(false)}
                    />
                )}
            </>
        )}
    </>
    );
};

const MenuDropdown = ({ isOpen, position, onClose, menuRef, projectId, card, onEdit }: { isOpen: boolean; position: { top: number; left: number }; onClose: () => void; menuRef: React.RefObject<HTMLDivElement | null>; projectId: string; card: Card; onEdit: () => void }) => {
    if (!isOpen) return null;
    return (
        <div
            className="fixed w-32 bg-[var(--neutral-400)] rounded-md shadow-lg py-1 z-50"
            style={{ top: position.top, left: position.left }}
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="flex items-center gap-2 px-4 py-2 text-[var(--neutral-800)] hover:bg-[var(--neutral-200)] cursor-pointer"
                onClick={() => {
                    onClose();
                    onEdit();
                }}
            >
                <FiEdit2 size={16} /> Edit
            </div>
            <div
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-[var(--neutral-200)] cursor-pointer"
                onClick={async () => {
                    onClose();
                    await deleteCard(projectId, card.id);
                }}
            >
                <FiTrash2 size={16} /> Delete
            </div>
        </div>
    );
};
