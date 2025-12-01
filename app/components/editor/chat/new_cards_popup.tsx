import { Dispatch, SetStateAction } from "react";
import { Card, Project } from "@/lib/types";
import DetailCard from "../cards/detail_card";

interface NewCardsPopupProps {
    newCards: Card[] | null | undefined;
    setClickedCard: Dispatch<SetStateAction<Card | null>>;
    projectId: string;
    project: Project;
}

const NewCardsPopup = ({ newCards, setClickedCard, projectId, project }: NewCardsPopupProps) => {
    const cards = Array.isArray(newCards) ? newCards : [];
    const lessonCardIds = new Set(project.courseLesson?.cardsToUnlock.map(c => c.id) || []);

    if (cards.length === 0) {
        return (
            <div className="p-4 text-[var(--neutral-500)] italic">
                (No new cards)
            </div>
        );
    }

    return (
        <>
        <h2 className="mb-1 text-lg">New cards: </h2>
        <hr className="mb-4"/>
            <div className="flex flex-row gap-4 p-2 mb-4 w-full overflow-x-auto">
                {cards.map((card) => (
                    <div key={card.id} className="shrink-0">
                        <DetailCard card={card} onClick={() => setClickedCard(card)} projectId={projectId} isLessonCard={lessonCardIds.has(card.id)}/>
                    </div>
                ))}
            </div>
        </>
    );
};

export default NewCardsPopup;
