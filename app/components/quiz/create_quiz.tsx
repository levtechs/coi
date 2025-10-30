import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";



import { useAuth } from "@/lib/AuthContext";

import { Card, QuizSettings } from "@/lib/types";

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
    const { user } = useAuth();
    const router = useRouter();

    const [isLoadingCards, setIsLoadingCards] = useState(false)
    const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean | string>(false)

    const [quizSettings, setQuizSettings] = useState<QuizSettings>({includeMCQ: true, includeFRQ: false});

    const [cards, setCards] = useState<Card[]>();
    const [clickedCard, setClickedCard] = useState<Card | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showErrorDetails, setShowErrorDetails] = useState(false);

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
                            {cards.filter(card => !card.url).map((card) => (
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

                        {error ? (
                            <div className="mt-4">
                                <p className="text-[var(--error)]">Error generating quiz</p>
                                <button
                                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                                    className="text-sm text-[var(--accent-500)] underline mt-1"
                                >
                                    {showErrorDetails ? 'Hide details' : 'Show details'}
                                </button>
                                {showErrorDetails && <p className="text-[var(--error)] mt-2 text-sm">{error}</p>}
                            </div>
                        ) : isLoadingQuiz === true ? (
                            <LoadingComponent loadingText="Creating quiz" small={true} />
                        ) : isLoadingQuiz === false ? (
                            <div className="">
                                <h2 className="mt-4 mb-4 italic">
                                    Quiz settings:
                                </h2>

                                <div className="flex flex-row gap-2">
                                     <button
                                        className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${quizSettings.includeMCQ ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                                        onClick={() => {setQuizSettings({...quizSettings, includeMCQ: !quizSettings.includeMCQ}); setError(null);}}
                                    >
                                        Include multiple choice questions
                                    </button>

                                    <button
                                        className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${quizSettings.includeFRQ ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                                        onClick={() => {setQuizSettings({...quizSettings, includeFRQ: !quizSettings.includeFRQ}); setError(null);}}
                                    >
                                        Include free response questions
                                    </button>
                                 </div>
                                 {error && <p className="text-[var(--error)] mt-2">{error}</p>}
                             </div>
                        ) : null}

                        {isLoadingQuiz === false && !error && (
                            <Button
                                className="w-full mt-8"
                                color="var(--accent-400)"
                                onClick={async ()=>{
                                    if (!quizSettings.includeMCQ && !quizSettings.includeFRQ) {
                                        setError("Please select at least one type of question to include in your quiz.");
                                        return;
                                    }
                                    setError(null);
                                    setIsLoadingQuiz(true);
                                    try {
                                        const quizId = await createQuiz(cards, quizSettings, projectId);
                                        setIsLoadingQuiz(quizId);
                                    } catch (err) {
                                        setError((err as Error).message);
                                        setIsLoadingQuiz(false);
                                    }
                                }}
                                type="submit"
                            >
                                Create Quiz
                            </Button>
                        )}

                        {typeof isLoadingQuiz === 'string' && (
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
