import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Card, CourseLesson } from "@/lib/types";
import DetailCard from "../cards/detail_card";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
import { FiExternalLink } from "react-icons/fi";
import { BsTrophy } from "react-icons/bs";

interface NewCardsPopupProps {
    newCards: Card[] | null | undefined;
    setClickedCard: Dispatch<SetStateAction<Card | null>>;
    projectId: string;
    courseLesson?: CourseLesson;
    courseId?: string;
}

const NewCardsPopup = ({ newCards, setClickedCard, projectId, courseLesson, courseId }: NewCardsPopupProps) => {
    const cards = Array.isArray(newCards) ? newCards : [];

    const [lessonProgress, setLessonProgress] = useState<{ percentage: number; unlockedCount: number; totalCards: number } | null>(null);

    const unlockedCards = cards.filter(c => c.isUnlocked);
    const newCardsOnly = cards.filter(c => !c.isUnlocked);

    useEffect(() => {
        if (!courseLesson?.cardsToUnlock || courseLesson.cardsToUnlock.length === 0) {
            return;
        }

        const calculateProgress = async () => {
            try {
                const allCards = await fetchCardsFromProject(projectId);
                const unlockedFromCards = allCards.filter((card) => card.isUnlocked);
                const unlockedCount = unlockedFromCards.length;
                const totalCards = courseLesson.cardsToUnlock.length;
                const percentage = Math.round((unlockedCount / totalCards) * 100);

                setLessonProgress({
                    percentage,
                    unlockedCount,
                    totalCards
                });
            } catch (error) {
                console.error('Error calculating lesson progress:', error);
            }
        };

        calculateProgress();
    }, [courseLesson, projectId]);

    if (cards.length === 0) {
        return (
            <div className="p-4 text-[var(--neutral-500)] italic">
                (No new cards)
            </div>
        );
    }

    const isComplete = lessonProgress?.percentage === 100;

    return (
        <div className="max-h-[70vh] overflow-y-auto">
            {unlockedCards.length > 0 && (
                <div className="mb-4 bg-[var(--accent-100)] border border-[var(--accent-300)] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-[var(--accent-700)]">
                                {unlockedCards.length} card{unlockedCards.length !== 1 ? 's' : ''} unlocked!
                            </p>
                            {lessonProgress && (
                                <p className="text-sm text-[var(--accent-600)]">
                                    Lesson progress: {lessonProgress.unlockedCount}/{lessonProgress.totalCards} ({lessonProgress.percentage}%)
                                </p>
                            )}
                        </div>
                        {isComplete && (
                            <div className="flex items-center gap-2 text-[var(--accent-600)]">
                                <BsTrophy className="w-6 h-6" />
                            </div>
                        )}
                    </div>
                    {isComplete && courseId && courseLesson && (
                        <div className="mt-3 pt-3 border-t border-[var(--accent-300)]">
                            <p className="text-sm font-medium text-[var(--accent-700)] mb-2">
                                Congratulations! You completed this lesson!
                            </p>
                            <a
                                href={`/courses/${courseId}/${courseLesson.index}`}
                                className="inline-flex items-center gap-2 text-sm bg-[var(--accent-500)] text-white px-3 py-2 rounded hover:bg-[var(--accent-600)] transition-colors"
                            >
                                <FiExternalLink className="w-4 h-4" />
                                Go to Lesson
                            </a>
                        </div>
                    )}
                </div>
            )}

            {newCardsOnly.length > 0 && (
                <>
                    <h2 className="mb-1 text-lg">New cards: </h2>
                    <hr className="mb-4"/>
                </>
            )}

            {newCardsOnly.length > 0 && (
                <div className="flex flex-row gap-4 p-2 mb-4 w-full overflow-x-auto">
                    {newCardsOnly.map((card) => (
                        <div key={card.id} className="shrink-0">
                            <DetailCard card={card} onClick={() => setClickedCard(card)} projectId={projectId}/>
                        </div>
                    ))}
                </div>
            )}

            {unlockedCards.length > 0 && (
                <>
                    <h2 className="mb-1 text-lg">Unlocked cards: </h2>
                    <hr className="mb-4"/>
                </>
            )}

            {unlockedCards.length > 0 && (
                <div className="flex flex-row gap-4 p-2 mb-4 w-full overflow-x-auto">
                    {unlockedCards.map((card) => (
                        <div key={card.id} className="shrink-0">
                            <DetailCard card={card} onClick={() => setClickedCard(card)} projectId={projectId}/>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NewCardsPopup;
