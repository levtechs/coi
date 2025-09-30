import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";



import { useAuth } from "@/lib/AuthContext";

import { Card } from "@/lib/types";

import { getCards } from "@/app/views/cards";
import { createQuiz } from "@/app/views/quiz";

import LoadingComponent from "../loading";
import DetailCard from "../editor/cards/detail_card";
import CardPopup from "../editor/cards/card_popup";
import Button from "../button";

interface CreateQuizPageProps {
    projectId: string;
}

const CreateQuizPage = ({projectId} : CreateQuizPageProps) => {
    const [isLoadingCards, setIsLoadingCards] = useState(false)
    const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean | string>(false)

    const { user } = useAuth();

    const [cards, setCards] = useState<Card[]>();
    const [clickedCard, setClickedCard] = useState<Card | null>(null);



    const router = useRouter();

    useEffect(() => {
        setIsLoadingCards(true);
        if (!user) return;

        const fetchCards = async () => {
            const cards = await getCards(projectId);
            setCards(cards);
            setIsLoadingCards(false);
        }
        
        fetchCards();
    }, [user, projectId])

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
                                <h2 className="mt-4 mb-4 italic">
                                    No options available yet.
                                </h2>
                            </>

                        )}
                        {isLoadingQuiz==true && (<LoadingComponent loadingText="Creating quiz" small={true} />)}
                        {typeof(isLoadingQuiz) != typeof("string") ? (
                            <Button 
                                className="w-full mt-8"
                                color={isLoadingQuiz ?  ("var(--neutral-400)") : ("var(--accent-400)")}
                                onClick={async ()=>{
                                    setIsLoadingQuiz(true);
                                    const quizId = await createQuiz(cards, projectId);
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
                                    router.push(`/quiz/${isLoadingQuiz}`);
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

export default CreateQuizPage;