import { useState, useEffect } from "react";

import { FiCheck } from "react-icons/fi";

import { useAuth } from "@/lib/AuthContext";

import { Card } from "@/lib/types";

import { getCards } from "@/app/views/cards";
import { createQuiz } from "@/app/views/quiz";

import LoadingComponent from "../../loading";
import DetailCard from "../cards/detail_card";
import CardPopup from "../cards/card_popup";
import Button from "../../button";

interface CreateQuizPanelProps {
    projectId: string;
}

const CreateQuizPanel = ({projectId} : CreateQuizPanelProps) => {
    const [isLoadingCards, setIsLoadingCards] = useState(false)
    const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean | string>(false)

    const { user } = useAuth();

    const [cards, setCards] = useState<Card[]>();
    const [clickedCard, setClickedCard] = useState<Card | null>(null);

    const [useFR, setUseFR] = useState(false)

    useEffect(() => {
        setIsLoadingCards(true);
        if (!user) return;

        const fetchCards = async () => {
            const cards = await getCards(projectId);
            setCards(cards);
            setIsLoadingCards(false);
        }
        
        fetchCards();
    }, [user])

    if (isLoadingCards) return (<LoadingComponent loadingText="Loading cards"/>)

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-100)]">
            <div className="p-6 w-3xl bg-[var(--neutral-200)] rounded-md justify-center">
                <h1 className="font-bold text-2xl mb-4">
                    Create a new quiz
                </h1>
                {cards ? (
                    <>
                        <h2>
                            Cards:
                        </h2>
                        <div className="flex flex-row gap-8 p-4 w-full overflow-x-auto">
                            {cards.map((card) => (
                                <div key={card.id} className="shrink-0">
                                    <DetailCard 
                                        card={card}
                                        onClick={() => {setClickedCard(card)}}
                                    />
                                </div>
                            ))}
                        </div>
                        {clickedCard && (
                            <CardPopup 
                                card={clickedCard} 
                                onClose={() => setClickedCard(null)}
                            />
                        )}

                        {isLoadingQuiz==false && (
                            <>
                                <h2 className="mt-4 mb-4">
                                    Options:
                                </h2>
                                <div className="flex items-center gap-4 py-2">
                                    <label className="relative flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useFR}
                                            onChange={(e) => setUseFR(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-6 h-6 rounded-md border border-[var(--neutral-300)] bg-[var(--neutral-100)] flex items-center justify-center transition-all duration-200 peer-checked:bg-[var(--accent-500)] peer-checked:border-[var(--accent-500)]">
                                            <FiCheck
                                                className="text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                                            />
                                        </div>
                                    </label>
                                    <label htmlFor="longLived" className="text-[var(--foreground)] text-lg cursor-pointer">
                                        Use free-response questions
                                    </label>
                                </div>
                            </>

                        )}
                        {isLoadingQuiz==true && (<LoadingComponent loadingText="Creating quiz" small={true} />)}
                        {typeof(isLoadingQuiz) != typeof("string") ? (
                            <Button 
                                className="w-full mt-8"
                                color={isLoadingQuiz ?  ("var(--neutral-400)") : ("var(--accent-400)")}
                                onClick={async ()=>{
                                    setIsLoadingQuiz(true);
                                    const quizId = await createQuiz(cards);
                                    setIsLoadingQuiz(quizId);
                                }}
                                type="submit"
                            >
                                Go!
                            </Button>
                        ) : (
                            <Button 
                                className="w-full mt-8"
                                color="var(--accent-400)"
                                onClick={()=>{
                                    window.open(`/quiz/${isLoadingQuiz}`);
                                }}
                                type="submit"
                            >
                                Take quiz
                            </Button>
                        )}

                    </>
                ) : (
                    <>
                        <h2 className="italic">
                            No cards found.
                        </h2>
                        <p className="italic">
                            Choose a project with cards to make a quiz.
                        </p>
                    </>
                )}

            </div>
        </div>

    );
}

export default CreateQuizPanel