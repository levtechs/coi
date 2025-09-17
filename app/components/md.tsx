"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

/**
 * Ensure display math $$ ... $$ are on their own lines and normalized.
 * This avoids cases where single-line breaks inside the block or missing blank
 * lines cause the markdown/math parser to break.
 */
export function normalizeMathMarkdown(md: string) {
    // normalize newlines
    md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Put each $$ block on its own lines with surrounding blank lines.
    // This preserves what's inside, trimmed.
    md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
        return `\n\n$$\n${inner.trim()}\n$$\n\n`;
    });

    return md;
}

/**
 * Quick sanity check for unmatched delimiters.
 * Returns { ok: boolean, details: string }
 */
export function checkMathBalance(md: string) {
    // Count $$ pairs
    const dbl = md.match(/\$\$/g);
    const dblCount = dbl ? dbl.length : 0;
    if (dblCount % 2 !== 0) {
        return { ok: false, details: `Odd number of $$ found (${dblCount}).` };
    }

    // Remove $$ ... $$ blocks so we only check single-dollar inline delimiters
    const withoutDbl = md.replace(/\$\$[\s\S]*?\$\$/g, "");

    // Count single $ occurrences (not part of $$)
    const singleMatches = withoutDbl.match(/\$/g) || [];
    const singleCount = singleMatches.length;
    if (singleCount % 2 !== 0) {
        return { ok: false, details: `Odd number of single $ found (${singleCount}).` };
    }

    return { ok: true, details: `OK: $$ pairs ${dblCount}, single $ ${singleCount}` };
}

/**
 * A compact Markdown renderer that:
 *  - normalizes display math
 *  - verifies math delimiters and logs helpful debug messages
 *  - uses rehype-katex for math rendering
 *  - reduces heading/paragraph spacing so titles aren't too far apart
 */

type Props = {
    markdown: string;
    singleLine?: boolean;
};

export default function MarkdownArticle({ markdown, singleLine }: Props) {
    const normalized = useMemo(() => normalizeMathMarkdown(markdown), [markdown]);

    // debug / sanity
    const balance = useMemo(() => checkMathBalance(normalized), [normalized]);
    if (!balance.ok) {
        // Helpful console info for debugging stray delimiters
        // (Don't throw; we try rendering anyway but this hints at the underlying issue.)
        console.warn("[MarkdownArticle] Math delimiter imbalance:", balance.details);
        // Optionally: log the area around first occurrence for quicker debug:
        const excerpt = normalized.slice(0, 2000);
        console.debug("[MarkdownArticle] excerpt:", excerpt);
    }

    const style = `${singleLine ? "" : "mb-2 "}text-[var(--foreground)]`;
    return (
        <div className="prose prose-sm max-w-none">
            <ReactMarkdown
                // plugins
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                // component overrides to control spacing and avoid overly large gaps
                components={{
                    h1: ({ ...props }) => <h1 className={style} {...props} />,
                    h2: ({ ...props }) => <h2 className={style} {...props} />,
                    h3: ({ ...props }) => <h3 className={style} {...props} />,
                    h4: ({ ...props }) => <h4 className={style} {...props} />,
                    h5: ({ ...props }) => <h5 className={style} {...props} />,
                    h6: ({ ...props }) => <h6 className={style} {...props} />,
                    p: ({ ...props }) => <p className={style} {...props} />,
                }}
            >
                {normalized}
            </ReactMarkdown>
        </div>
    );
}