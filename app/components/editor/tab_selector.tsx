"use client";

import React, { useState } from "react";

type TabProps = {
    tabs: string[];
    onTabChange: (tabName: string) => void;
};

const TabSelector = ({ tabs, onTabChange }: TabProps) => {
    const [activeTab, setActiveTab] = useState(tabs[0]);

    const handleTabClick = (tabName: string) => {
        setActiveTab(tabName);
        onTabChange(tabName);
    };

    return (
        <div className="flex w-full max-w-sm rounded-lg overflow-hidden bg-[var(--neutral-200)] p-1">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
                    className={`
                        flex-1 px-4 py-2 text-center text-sm font-medium transition-colors duration-200
                        ${activeTab === tab
                            ? 'text-[var(--primary)] bg-[var(--accent-500)] shadow-md rounded-md'
                            : 'text-[var(--neutral-700)] hover:text-[var(--neutral-900)]'
                        }
                    `}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
};

export default TabSelector;
