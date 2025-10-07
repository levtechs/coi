"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

/**
 * Normalize display math $$ ... $$ to be on their own lines.
 */
export function normalizeMathMarkdown(md: string) {
    md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
        return `\n\n$$\n${inner.trim()}\n$$\n\n`;
    });
    return md;
}

/**
 * Sanity check for unmatched delimiters
 */
export function checkMathBalance(md: string) {
    const dbl = md.match(/\$\$/g);
    const dblCount = dbl ? dbl.length : 0;
    if (dblCount % 2 !== 0) return { ok: false, details: `Odd number of $$ found (${dblCount}).` };

    const withoutDbl = md.replace(/\$\$[\s\S]*?\$\$/g, "");
    const singleMatches = withoutDbl.match(/\$/g) || [];
    const singleCount = singleMatches.length;
    if (singleCount % 2 !== 0) return { ok: false, details: `Odd number of single $ found (${singleCount}).` };

    return { ok: true, details: `OK: $$ pairs ${dblCount}, single $ ${singleCount}` };
}

type Props = {
    markdown: string;
    singleLine?: boolean;
};

export default function MarkdownArticle({ markdown, singleLine }: Props) {
    const processedMarkdown = useMemo(() => normalizeMathMarkdown(markdown), [markdown]);

    const balance = useMemo(() => checkMathBalance(processedMarkdown), [processedMarkdown]);
    if (!balance.ok) {
        console.warn("[MarkdownArticle] Math delimiter imbalance:", balance.details);
        console.debug("[MarkdownArticle] excerpt:", processedMarkdown.slice(0, 2000));
    }

    const baseStyle = "text-[var(--foreground)] leading-relaxed";
    const headingBase = "font-semibold text-[var(--foreground)]";
    const paragraphBase = "text-[var(--foreground)] leading-relaxed mb-3";

    return (
        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)]">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                    h1: ({ ...props }) => (
                        <h1
                            className={`${headingBase} text-4xl mt-6 mb-3 border-b border-[var(--neutral-400)] pb-1`}
                            {...props}
                        />
                    ),
                    h2: ({ ...props }) => (
                        <h2
                            className={`${headingBase} text-3xl mt-5 mb-2 border-b border-[var(--neutral-400)] pb-[2px]`}
                            {...props}
                        />
                    ),
                    h3: ({ ...props }) => (
                        <h3
                            className={`${headingBase} text-2xl mt-4 mb-2 text-[var(--accent-600)]`}
                            {...props}
                        />
                    ),
                    h4: ({ ...props }) => (
                        <h4 className={`${headingBase} text-xl mt-3 mb-1`} {...props} />
                    ),
                    h5: ({ ...props }) => (
                        <h5 className={`${headingBase} text-lg mt-2 mb-1`} {...props} />
                    ),
                    h6: ({ ...props }) => (
                        <h6 className={`${headingBase} text-base mt-2 mb-1`} {...props} />
                    ),
                    p: ({ ...props }) => (
                        <p className={paragraphBase} {...props} />
                    ),
                    ul: ({ ...props }) => (
                        <ul className="list-disc list-outside ml-6 mb-3 space-y-1" {...props} />
                    ),
                    ol: ({ ...props }) => (
                        <ol className="list-decimal list-outside ml-6 mb-3 space-y-1" {...props} />
                    ),
                }}
            >
                {processedMarkdown}
            </ReactMarkdown>
        </div>
    );
}
