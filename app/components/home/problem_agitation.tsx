"use client";

import React from "react";
import { FiX } from "react-icons/fi";

const ProblemAgitation = () => {
    return (
        <section className="py-20 bg-[var(--neutral-500)]/20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold text-[var(--neutral-900)] mb-6">
                        The Problem with Traditional Studying
                    </h2>
                    <p className="text-xl text-[var(--neutral-600)] max-w-3xl mx-auto">
                        Most students rely on outdated methods like rereading notes, using generic AI chatbots, or studying alone. While these approaches seem convenient, they come with significant drawbacks.
                    </p>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="bg-[var(--neutral-300)] rounded-xl p-8 shadow-lg border border-[var(--neutral-300)] hover:scale-105 transition-all duration-300">
                         <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6 mx-auto">
                             <FiX className="w-8 h-8 text-red-500" />
                         </div>
                         <h3 className="text-2xl font-bold text-[var(--neutral-900)] mb-4 text-center">
                             Inefficient Time Use
                         </h3>
                        <p className="text-[var(--neutral-600)] text-center">
                            Hours spent passively rereading the same material without active recall or spaced repetition, leading to poor retention and wasted study time.
                        </p>
                    </div>

                     <div className="bg-[var(--neutral-300)] rounded-xl p-8 shadow-lg border border-[var(--neutral-300)] hover:scale-105 transition-all duration-300">
                         <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6 mx-auto">
                             <FiX className="w-8 h-8 text-red-500" />
                         </div>
                         <h3 className="text-2xl font-bold text-[var(--neutral-900)] mb-4 text-center">
                             Lack of Collaboration
                         </h3>
                        <p className="text-[var(--neutral-600)] text-center">
                            Studying in isolation misses out on peer discussions, shared insights, and the motivation that comes from learning with others.
                        </p>
                    </div>

                     <div className="bg-[var(--neutral-300)] rounded-xl p-8 shadow-lg border border-[var(--neutral-300)] hover:scale-105 transition-all duration-300">
                         <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6 mx-auto">
                             <FiX className="w-8 h-8 text-red-500" />
                         </div>
                         <h3 className="text-2xl font-bold text-[var(--neutral-900)] mb-4 text-center">
                             Generic AI Responses
                         </h3>
                        <p className="text-[var(--neutral-600)] text-center">
                            Using general-purpose AI like ChatGPT provides broad answers that don&apos;t adapt to your specific learning needs or course material.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProblemAgitation;
