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

    const baseStyle = "text-[var(--foreground)]";
    const headingSpacing = singleLine ? "" : "mb-4 mt-2";

    return (
        <div className="prose prose-sm max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                    h1: ({ ...props }) => <h1 className={`${baseStyle} text-4xl underline ${headingSpacing}`} {...props} />,
                    h2: ({ ...props }) => <h2 className={`${baseStyle} text-3xl underline ${headingSpacing}`} {...props} />,
                    h3: ({ ...props }) => <h3 className={`${baseStyle} text-3xl underline ${headingSpacing}`} {...props} />,
                    h4: ({ ...props }) => <h4 className={`${baseStyle} text-xl ${headingSpacing}`} {...props} />,
                    h5: ({ ...props }) => <h5 className={`${baseStyle} text-lg ${headingSpacing}`} {...props} />,
                    h6: ({ ...props }) => <h6 className={`${baseStyle} text-base ${headingSpacing}`} {...props} />,
                    p: ({ ...props }) => <p className={`${baseStyle} ${headingSpacing}`} {...props} />,
                }}
            >
                {processedMarkdown}
            </ReactMarkdown>
        </div>
    );
}
