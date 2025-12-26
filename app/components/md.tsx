"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Card } from "@/lib/types";


/**
 * Normalize math delimiters in Markdown for remark-math + rehype-katex.
 * - Converts \( ... \) → $...$
 * - Converts \[ ... \] → $$...$$
 * - Normalizes $$...$$ blocks to be on their own lines
 * - Optionally converts (math) patterns into $math$
 */
export function normalizeMathMarkdown(md: string) {
    // Normalize newlines
    md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Convert LaTeX-style math delimiters to remark-math format
    // Display math: \[ ... \] → $$ ... $$
    md = md.replace(/\\\[(.+?)\\\]/gs, (_, inner) => {
        return `\n\n$$\n${inner.trim()}\n$$\n\n`;
    });

    // Inline math: \( ... \) → $ ... $
    md = md.replace(/\\\((.+?)\\\)/gs, (_, inner) => {
        return `$${inner.trim()}$`;
    });

    // Normalize display math $$ ... $$ blocks to have line spacing
    md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
        return `\n\n$$\n${inner.trim()}\n$$\n\n`;
    });

    return md;
}


/**
 * Replace card references with clickable underlined titles
 */
export function processCardReferences(markdown: string, cards?: Card[], onCardClick?: (card: Card) => void): string {
    if (!cards || cards.length === 0) {
        return markdown;
    }

    const cardMap = new Map(cards.map(card => [card.id, card]));
    
    return markdown.replace(/\(card:\s*([^)]+)\)/g, (match, cardId) => {
        const trimmedCardId = cardId.trim();
        const card = cardMap.get(trimmedCardId);
        if (card) {
            if (onCardClick) {
                return `<span class="card-reference cursor-pointer hover:text-[var(--accent-500)] transition-colors" data-card-id="${trimmedCardId}"><u>${card.title}</u></span>`;
            }
            return `<u>${card.title}</u>`;
        }
        return match; // Keep original if card not found
    });
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
    cards?: Card[];
    onCardClick?: (card: Card) => void;
};

export default function MarkdownArticle({ markdown, singleLine = false, cards, onCardClick }: Props) {
    const processedMarkdown = useMemo(() => {
        const withCardReferences = processCardReferences(markdown, cards, onCardClick);
        return normalizeMathMarkdown(withCardReferences);
    }, [markdown, cards, onCardClick]);

    const balance = useMemo(() => checkMathBalance(processedMarkdown), [processedMarkdown]);
    if (!balance.ok) {
        console.warn("[MarkdownArticle] Math delimiter imbalance:", balance.details);
        console.debug("[MarkdownArticle] excerpt:", processedMarkdown.slice(0, 2000));
    }

    const baseStyle = "text-[var(--foreground)] leading-relaxed";
    const headingBase = "font-semibold text-[var(--foreground)]";
    const paragraphBase = `${baseStyle} ${singleLine ? "" : "mb-3"}`;
    const headingSpacing = singleLine ? "" : "mt-3 mb-2";
    const listSpacing = singleLine ? "" : "ml-6 mb-3 space-y-1";

    return (
        <div
            className={`max-w-none ${
                singleLine ? "m-0 p-0" : ""
            }`}
        >
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                    span: ({ className, children, ...props }) => {
                        if (className?.includes('card-reference')) {
                            const cardId = (props as Record<string, unknown>)['data-card-id'] as string;
                            const card = cards?.find(c => c.id === cardId);
                            if (card && onCardClick) {
                                return (
                                    <span 
                                        className="card-reference cursor-pointer hover:text-[var(--accent-500)] transition-colors"
                                        onClick={() => onCardClick(card)}
                                    >
                                        <u>{children}</u>
                                    </span>
                                );
                            }
                        }
                        return <span className={className} {...props}>{children}</span>;
                    },
                    h1: ({ ...props }) => (
                        <h1
                            className={`${headingBase} text-4xl ${headingSpacing} ${
                                singleLine ? "" : "border-b border-[var(--neutral-400)] pb-1"
                            }`}
                            {...props}
                        />
                    ),
                    h2: ({ ...props }) => (
                        <h2
                            className={`${headingBase} text-3xl ${headingSpacing} ${
                                singleLine ? "" : "border-b border-[var(--neutral-400)] pb-[2px]"
                            }`}
                            {...props}
                        />
                    ),
                    h3: ({ ...props }) => (
                        <h3
                            className={`${headingBase} text-2xl ${headingSpacing} ${
                                singleLine ? "" : "text-[var(--accent-600)]"
                            }`}
                            {...props}
                        />
                    ),
                    h4: ({ ...props }) => (
                        <h4 className={`${headingBase} text-xl ${headingSpacing}`} {...props} />
                    ),
                    h5: ({ ...props }) => (
                        <h5 className={`${headingBase} text-lg ${headingSpacing}`} {...props} />
                    ),
                    h6: ({ ...props }) => (
                        <h6 className={`${headingBase} text-base ${headingSpacing}`} {...props} />
                    ),
                    p: ({ ...props }) => <p className={paragraphBase} {...props} />,
                    ul: ({ ...props }) => <ul className={`list-disc list-outside ${listSpacing}`} {...props} />,
                    ol: ({ ...props }) => <ol className={`list-decimal list-outside ${listSpacing}`} {...props} />,
                }}
            >
                {processedMarkdown}
            </ReactMarkdown>
        </div>
    );
}
