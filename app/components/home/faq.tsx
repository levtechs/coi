"use client";

import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const FAQ = () => {
    const [openItems, setOpenItems] = useState<Set<number>>(new Set());

    const toggleItem = (index: number) => {
        const newOpenItems = new Set(openItems);
        if (newOpenItems.has(index)) {
            newOpenItems.delete(index);
        } else {
            newOpenItems.add(index);
        }
        setOpenItems(newOpenItems);
    };

    const faqs = [
        {
            question: "Is Coi really free to use?",
            answer: "Yes! Coi is currently 100% free with no paid plans. You get access to all features including project creation, advanced AI tutoring, flashcards, note organization, and collaborative study groups. Paid plans will be added soon, so take advantage of the free access while you can!"
        },
        {
            question: "How does the AI tutoring work?",
            answer: "Our adaptive AI tutor learns from your course materials and study patterns to provide personalized explanations. It can answer questions about your specific content, generate practice questions, and adapt its teaching style to how you learn best."
        },
        {
            question: "Can I use Coi for any subject or course?",
            answer: "Yes! Coi works for any subject from high school to university level. Whether you're studying history, biology, mathematics, or any other field, our AI adapts to your specific content and learning needs."
        },
        {
            question: "How do collaborative study groups work?",
            answer: "You can create or join projects where members can share insights, notes, and resources in real-time. Everyone can contribute to group learning, review each other's work, and advance together through shared AI tutoring sessions."
        },
        {
            question: "What makes Coi different from other study apps?",
            answer: "Unlike generic AI chatbots or basic flashcard apps, Coi combines adaptive AI tutoring, collaborative learning, and comprehensive study tools in one platform. It learns from your materials and adapts to your learning style for truly personalized education."
        },
    ];

    return (
        <section className="py-10 bg-[var(--neutral-500)]/20">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold text-[var(--neutral-900)] mb-6">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-xl text-[var(--neutral-600)]">
                        Everything you need to know about getting started with Coi.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-[var(--neutral-100)] rounded-lg border border-[var(--neutral-300)] overflow-hidden"
                        >
                            <button
                                onClick={() => toggleItem(index)}
                                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-[var(--neutral-200)] transition-colors"
                            >
                                <h3 className="text-lg font-semibold text-[var(--neutral-900)]">
                                    {faq.question}
                                </h3>
                                {openItems.has(index) ? (
                                    <FiChevronUp className="w-5 h-5 text-[var(--neutral-600)]" />
                                ) : (
                                    <FiChevronDown className="w-5 h-5 text-[var(--neutral-600)]" />
                                )}
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    openItems.has(index)
                                        ? 'max-h-96 opacity-100'
                                        : 'max-h-0 opacity-0'
                                }`}
                            >
                                <div className="px-6 pb-4">
                                    <p className="text-[var(--neutral-700)] leading-relaxed">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <p className="text-[var(--neutral-600)] mb-4">
                        Still have questions?
                    </p>
                    <a
                        href="mailto:info@coilearn.com"
                        className="text-[var(--accent-500)] hover:text-[var(--accent-600)] font-semibold"
                    >
                        Contact our support team
                    </a>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
