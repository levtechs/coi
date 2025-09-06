"use client";

import React, { useState } from "react";

import MarkdownArticle from "../md";

import { FiChevronRight, FiChevronDown } from "react-icons/fi";

import { Project } from "@/lib/types";

// Defines a structured content node which can be nested
interface StructuredContent {
    title?: string;
    details: (string | StructuredContent)[];
}

// Recursive component to render structured content with collapsibility
interface StructuredContentProps {
    data: StructuredContent;
    level?: number;
}

const StructuredContentRenderer = ({ data, level = 2 }: StructuredContentProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!data) {
        return <p className="text-[var(--neutral-500)]">(No content)</p>;
    }

    // Determine the heading size based on the nesting level
    const headingSize = level > 5 ? 5 : level;
    const headingClass = `text-${2 + (5 - headingSize)}xl font-semibold`;

    return (
        <div className="flex flex-col">
            {data.title && (
                <div 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-2 cursor-pointer mb-2"
                >
                    {isCollapsed ? (
                        <FiChevronRight className="text-[var(--neutral-500)]" size={24} />
                    ) : (
                        <FiChevronDown className="text-[var(--neutral-500)]" size={24} />
                    )}
                    {React.createElement(
                        `h${headingSize}`,
                        {
                            className: `text-[var(--foreground)] ${headingClass}`
                        },
                        <MarkdownArticle markdown={data.title} />
                    )}
                </div>
            )}
            {!isCollapsed && (
                <div className="ml-4 space-y-4"> {/* Use space-y for consistent vertical spacing */}
                    {Array.isArray(data.details) && data.details.map((item, index) => {
                        if (typeof item === 'string') {
                            // Render string content inside a single ReactMarkdown block
                            // The `prose` class will now handle all internal formatting (bullets, lists, paragraphs)
                            return (
                                <div key={index} className="prose prose-sm max-w-none text-[var(--foreground)]">
                                    <MarkdownArticle markdown={item} />
                                </div>
                            );
                        }
                        if (typeof item === 'object' && item !== null) {
                            return (
                                <div key={index} className="ml-4">
                                    <StructuredContentRenderer
                                        data={item}
                                        level={level < 5 ? level + 1 : 5}
                                    />
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            )}
        </div>
    );
};

interface ContentPanelProps {
    project: Project;
    hidden: boolean
}

const ContentPanel = ({ project, hidden }: ContentPanelProps) => {
    const content = project.content ? project.content as unknown as StructuredContent : null;
    
    return (
        <div className={`flex-1 min-h-[75vh] max-w-[95%] ${hidden ? 'hidden' : ''}`}>
            <div className="relative p-3 rounded-md text-[var(--foreground)] h-full">
                {/* Render content */}
                {content ? (
                    <StructuredContentRenderer data={content} />
                ) : (
                    <p className="text-[var(--neutral-500)]">(No content)</p>
                )}
            </div>
        </div>
    );
};

export default ContentPanel;
