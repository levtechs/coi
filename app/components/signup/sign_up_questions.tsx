"use client";

import { useState } from "react";
import { Role, Interest, HowDidYouHear, SignUpResponses } from "@/lib/types";
import Button from "@/app/components/button";
import { FiBookOpen, FiUser, FiSearch, FiHeart, FiBriefcase, FiAward, FiHelpCircle, FiMoreHorizontal, FiZap } from "react-icons/fi";

interface SignUpQuestionsProps {
    onSubmit: (responses: SignUpResponses) => void;
    onSkip: () => void;
}

export default function SignUpQuestions({ onSubmit, onSkip }: SignUpQuestionsProps) {
    const [role, setRole] = useState<Role | "">("");
    const [howDidYouHear, setHowDidYouHear] = useState<HowDidYouHear[]>([]);
    const [interests, setInterests] = useState<Interest[]>([]);

    const handleHowDidYouHear = (option: HowDidYouHear, checked: boolean) => {
        setHowDidYouHear(prev =>
            checked ? [...prev, option] : prev.filter(item => item !== option)
        );
    };

    const handleInterests = (interest: Interest, checked: boolean) => {
        setInterests(prev =>
            checked ? [...prev, interest] : prev.filter(item => item !== interest)
        );
    };

    const handleSubmit = () => {
        const responses: SignUpResponses = {
            role: role || undefined,
            howDidYouHear,
            interests,
        };
        onSubmit(responses);
    };

    // Show continue button if user has answered at least one question
    const hasAnsweredSomething = role || howDidYouHear.length > 0 || interests.length > 0;

    const formatLabel = (str: string) => {
        return str.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-4">
                {/* Role selection */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                        What is your role? (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: "teacher" as Role, label: "Teacher", icon: FiBookOpen },
                            { value: "highschool_student" as Role, label: "High School Student", icon: FiUser },
                            { value: "university_student" as Role, label: "University Student", icon: FiSearch },
                            { value: "grad_student" as Role, label: "Grad Student", icon: FiAward },
                            { value: "researcher" as Role, label: "Researcher", icon: FiZap },
                            { value: "parent" as Role, label: "Parent", icon: FiHeart },
                            { value: "professional" as Role, label: "Professional", icon: FiBriefcase },
                            { value: "other" as Role, label: "Other", icon: FiMoreHorizontal }
                        ].map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                className={`px-3 py-2 rounded-md transition-colors duration-200 text-sm whitespace-nowrap flex items-center gap-2 ${role === value ? 'bg-[var(--neutral-400)] text-[var(--foreground)]' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                                onClick={() => setRole(role === value ? "" : value)}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* How did you hear - selectors */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                        How did you hear about us?
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(Object.values({
                            word_of_mouth: "word_of_mouth",
                            google_search: "google_search",
                            instagram: "instagram",
                            twitter: "twitter",
                            facebook: "facebook",
                            linkedin: "linkedin",
                            online_forum: "online_forum",
                            blog_article: "blog_article",
                            other: "other"
                        }) as HowDidYouHear[]).map(option => (
                            <button
                                key={option}
                                className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${howDidYouHear.includes(option) ? 'bg-[var(--neutral-400)] text-[var(--foreground)]' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                                onClick={() => handleHowDidYouHear(option, !howDidYouHear.includes(option))}
                            >
                                {formatLabel(option)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interests - selectors */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                        What are you interested in learning?
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(Object.values({
                            programming_technology: "programming_technology",
                            data_science: "data_science",
                            artificial_intelligence: "artificial_intelligence",
                            web_development: "web_development",
                            mobile_development: "mobile_development",
                            cybersecurity: "cybersecurity",
                            mathematics: "mathematics",
                            physics: "physics",
                            chemistry: "chemistry",
                            biology: "biology",
                            science: "science",
                            history: "history",
                            literature: "literature",
                            philosophy: "philosophy",
                            psychology: "psychology",
                            business_finance: "business_finance",
                            economics: "economics",
                            entrepreneurship: "entrepreneurship",
                            marketing: "marketing",
                            health_wellness: "health_wellness",
                            fitness: "fitness",
                            meditation: "meditation",
                            cooking: "cooking",
                            creative_arts: "creative_arts",
                            music: "music",
                            photography: "photography",
                            design_ux: "design_ux",
                            language_learning: "language_learning",
                            life_skills: "life_skills",
                            other: "other"
                        }) as Interest[]).map(interest => (
                            <button
                                key={interest}
                                className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${interests.includes(interest) ? 'bg-[var(--neutral-400)] text-[var(--foreground)]' : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'}`}
                                onClick={() => handleInterests(interest, !interests.includes(interest))}
                            >
                                {formatLabel(interest)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Continue button - always visible but disabled until user selects something */}
                <div className="pt-4">
                    <Button
                        onClick={handleSubmit}
                        color="var(--accent-500)"
                        className="w-full"
                        disabled={!hasAnsweredSomething}
                    >
                        Continue
                    </Button>
                </div>
            </div>
    );
}