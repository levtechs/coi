import { Dispatch, SetStateAction } from "react";
import { Card } from "@/lib/types";
import DetailCard from "../cards/detail_card";

interface NewCardsPopupProps {
    newCards: Card[] | null | undefined;
    setClickedCard: Dispatch<SetStateAction<Card | null>>;
}

const NewCardsPopup = ({ newCards, setClickedCard }: NewCardsPopupProps) => {
    const cards = Array.isArray(newCards) ? newCards : [];

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
                        <DetailCard card={card} onClick={() => setClickedCard(card)} />
                    </div>
                ))}
            </div>
        </>
    );
};

export default NewCardsPopup;
