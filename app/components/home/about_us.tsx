"use client";

import React from "react";
import Image from "next/image";
import { FaXTwitter } from "react-icons/fa6";
import { FiGithub } from "react-icons/fi";
import { RxDiscordLogo } from "react-icons/rx";

const AboutUs = () => {
    return (
        <section className="py-20 bg-[var(--neutral-500)]/20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <h2 className="text-4xl lg:text-5xl font-bold text-[var(--neutral-900)]">
                            Why I Built Coi
                        </h2>

                        <div className="space-y-6 text-lg text-[var(--neutral-600)] leading-relaxed">
                            <p>
                            {`As someone who's always been passionate about education, I noticed a gap in how students learn. Traditional methods often feel disconnected from real understanding, and generic AI tools don't adapt to individual learning styles or specific course material.`}
                            </p>

                            <p>
                            {`During my own studies, I struggled with inefficient study techniques and wished for a platform that could combine the power of AI with collaborative learning. That's when I started building Coi – a tool that would make studying more effective, engaging, and social.`}
                            </p>

                            <p>
                            {`Today, Coi helps hundreds of students worldwide transform their learning experience. It's not just about memorizing facts; it's about truly understanding concepts, collaborating with peers, and building knowledge that lasts.`}
                            </p>
                        </div>

                        <div className="flex gap-4">
                            {[
                                { href: "https://x.com/levtechs", label: "Twitter", Icon: FaXTwitter },
                                { href: "https://github.com/levtechs", label: "GitHub", Icon: FiGithub },
                                { href: "https://discordapp.com/users/739263047318634637", label: "Discord", Icon: RxDiscordLogo }
                            ].map(({ href, label, Icon }) => (
                                <a
                                    key={href}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 bg-[var(--neutral-200)] rounded-full flex items-center justify-center hover:bg-[var(--accent-500)] hover:text-white transition-colors"
                                    aria-label={label}
                                >
                                    <Icon size={20} />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                            <Image
                                src="/me.jpg"
                                alt="Lev Smolsky, Creator of Coi"
                                width={400}
                                height={400}
                                className="w-full h-auto"
                            />
                        </div>
                        <div className="absolute -bottom-6 -left-6 md:-left-6 bg-[var(--accent-500)] text-white rounded-lg p-4 shadow-lg md:transform-none transform -translate-x-1/2 left-1/2 md:left-auto">
                            <h3 className="font-bold text-lg">Lev Smolsky</h3>
                            <p className="text-sm opacity-90">Creator & Developer</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutUs;
