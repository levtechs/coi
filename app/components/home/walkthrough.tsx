import { useState, useEffect } from "react";
import Image from "next/image";

const WalkthroughComponent = ({ themeFolder, animationsEnabled, isMobile }: { themeFolder: string, animationsEnabled: boolean, isMobile: boolean }) => {
    const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const index = parseInt(entry.target.getAttribute('data-index') || '0');
                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => new Set(prev).add(index));
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        const elements = document.querySelectorAll('[data-index]');
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="w-full max-w-6xl z-10">
            {/* Dashboard Section */}
            <div
                data-index={0}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(0) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : 'translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/dashboard.png`}
                                alt="Dashboard screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Create projects to learn independently or share with a study group</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-1 text-right">
                            <p className="text-md md:text-xl">Create projects to learn independently or share with a study group</p>
                        </div>
                        <div className="relative transform translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/dashboard.png`}
                                alt="Dashboard screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                            />
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}

            {/* Chat Section */}
            <div
                data-index={1}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(1) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : '-translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/chat.png`}
                                alt="Chat screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Learn with an adaptive AI tutor</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="relative transform -translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/chat.png`}
                                alt="Chat screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform -rotate-3"
                            />
                        </div>
                        <div className="flex-1 text-left min-w-xl">
                            <p className="text-md md:text-xl">Learn with an adaptive AI tutor</p>
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}

            {/* Notes Section */}
            <div
                data-index={2}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(2) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : 'translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/notes.png`}
                                alt="Notes screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Organized hierarchy of notes curated for you and your study group as you learn</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-1 text-right">
                            <p className="text-md md:text-xl">Organized hierarchy of notes curated for you and your study group as you learn</p>
                        </div>
                        <div className="relative -transform translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/notes.png`}
                                alt="Notes screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                            />
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}

            {/* Cards Section */}
            <div
                data-index={3}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(3) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : '-translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="relative flex justify-center items-center gap-4 max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/card1.png`}
                                alt="Card1 screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                            <Image
                                src={`/demos/${themeFolder}/card2.png`}
                                alt="Card2 screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Cards generated automatically with information and resources</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="relative flex items-start transform -translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/card1.png`}
                                alt="Card1 screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3 z-10"
                            />
                            <Image
                                src={`/demos/${themeFolder}/card2.png`}
                                alt="Card2 screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform -rotate-2 -ml-32 z-20"
                            />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-md md:text-xl">Cards generated automatically with information and resources</p>
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}

            {/* Quiz Section */}
            <div
                data-index={4}
                className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} py-8 mb-8 ${isMobile ? '' : '-mt-16'} ${animationsEnabled ? 'transition-all duration-1000' : ''} ${
                    animationsEnabled ? (visibleSections.has(4) ? 'opacity-100 translate-x-0' : `opacity-0 ${isMobile ? '' : 'translate-x-full'}`) : 'opacity-100 translate-x-0'
                }`}
            >
                {isMobile ? (
                    <>
                        <div className="max-w-xs md:max-w-none mb-4 mx-auto">
                            <Image
                                src={`/demos/${themeFolder}/quiz.png`}
                                alt="Quiz screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-md md:text-xl">Test your knowledge with custom-generated quizzes</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-1 text-right">
                            <p className="text-md md:text-xl">Test your knowledge with custom-generated quizzes</p>
                        </div>
                        <div className="relative transform translate-x-1/4 md:transform-none max-w-xs md:max-w-none">
                            <Image
                                src={`/demos/${themeFolder}/quiz.png`}
                                alt="Quiz screenshot"
                                width={500}
                                height={375}
                                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow transform rotate-3"
                            />
                        </div>
                    </>
                )}
            </div>
            {isMobile && <hr className="w-full border-t border-[var(--neutral-300)] my-4" />}
        </div>
    );
};

export default WalkthroughComponent;