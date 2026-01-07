"use client";

import React from "react";
import { FiCheck, FiStar } from "react-icons/fi";

const Pricing = () => {
    const plans = [
        {
            name: "Free",
            price: "$0",
            period: "forever",
            description: "Perfect for getting started with basic study tools",
            features: [
                "Up to 5 projects",
                "Basic AI chat assistance",
                "Flashcard generation",
                "Note organization",
                "Community support"
            ],
            cta: "Get Started",
            popular: false
        },
        {
            name: "Pro",
            price: "$7",
            period: "per month",
            description: "Advanced features for serious students",
            features: [
                "Unlimited projects",
                "Advanced AI tutoring",
                "Custom quiz generation",
                "Collaborative study groups",
                "Progress analytics",
                "Priority support",
                "Export capabilities"
            ],
            cta: "Start Pro Trial",
            popular: true
        },
        {
            name: "Teams",
            price: "$9",
            period: "per user/month",
            description: "For study groups and educational institutions",
            features: [
                "Everything in Pro",
                "Team collaboration tools",
                "Admin dashboard",
                "Bulk user management",
                "Advanced analytics",
                "Custom integrations",
                "Dedicated support"
            ],
            cta: "Contact Sales",
            popular: false
        }
    ];

    return (
        <section className="py-20 bg-[var(--neutral-400)]/20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <FiCheck className="w-4 h-4" />
                        100% FREE to get started
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-bold text-[var(--neutral-900)] mb-6">
                        Choose Your Learning Plan
                    </h2>
                    <p className="text-xl text-[var(--neutral-600)] max-w-3xl mx-auto">
                        Start free and upgrade as your study needs grow. All plans include our 30-day money-back guarantee.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative bg-white rounded-2xl p-8 shadow-lg border-2 transition-all hover:shadow-xl ${
                                plan.popular ? 'border-[var(--accent-500)] scale-105' : 'border-[var(--neutral-300)]'
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <div className="bg-[var(--accent-500)] text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1">
                                        <FiStar className="w-4 h-4" />
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-[var(--neutral-900)] mb-2">
                                    {plan.name}
                                </h3>
                                <div className="mb-4">
                                    <span className="text-4xl font-bold text-[var(--neutral-900)]">
                                        {plan.price}
                                    </span>
                                    <span className="text-[var(--neutral-600)]">/{plan.period}</span>
                                </div>
                                <p className="text-[var(--neutral-600)]">
                                    {plan.description}
                                </p>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <FiCheck className="w-5 h-5 text-[var(--accent-500)] flex-shrink-0" />
                                        <span className="text-[var(--neutral-700)]">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                                    plan.popular
                                        ? 'bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)]'
                                        : 'bg-[var(--neutral-200)] text-[var(--neutral-900)] hover:bg-[var(--neutral-300)]'
                                }`}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <div className="bg-white rounded-lg p-6 shadow-lg border border-[var(--neutral-300)] max-w-2xl mx-auto">
                        <h3 className="text-xl font-bold text-[var(--neutral-900)] mb-2">
                            30-Day Money-Back Guarantee
                        </h3>
                        <p className="text-[var(--neutral-600)]">
                            Not satisfied with your results? Get a full refund within 30 days, no questions asked.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;