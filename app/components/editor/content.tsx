"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
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

    return (
        <div className="flex flex-col">
            {data.title && (
                <div 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-2 cursor-pointer mb-2 mt-4"
                >
                    {isCollapsed ? (
                        <FiChevronRight className="text-[var(--neutral-500)]" size={24} />
                    ) : (
                        <FiChevronDown className="text-[var(--neutral-500)]" size={24} />
                    )}
                    {React.createElement(
                        `h${level}`,
                        {
                            className: `text-[var(--foreground)] text-${2 + (5 - level)}xl font-semibold`
                        },
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {data.title}
                        </ReactMarkdown>
                    )}
                </div>
            )}
            {!isCollapsed && (
                <div className="ml-4">
                    {Array.isArray(data.details) && data.details.map((item, index) => {
                        if (typeof item === 'string') {
                            return (
                                <div key={index} className="mb-2 prose prose-sm max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {item}
                                    </ReactMarkdown>
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
}

const ContentPanel = ({ project }: ContentPanelProps) => {
    const content = project.content ? (JSON.parse(JSON.stringify(project.content)) as unknown as StructuredContent) : null;
    
    return (
        <div className="flex-1 min-h-[75vh]">
            <div className="relative group p-3 rounded-md text-[var(--foreground)] whitespace-pre-wrap h-full">
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
