"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Course } from "@/lib/types/course";

type CourseBrandedHeaderProps = {
  course: Course;
  className?: string;
};

function isFullHtmlDocument(html: string): boolean {
  const t = html.trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

/**
 * No scrollbars inside the iframe; document height follows content (parent sets iframe px height).
 */
function withNoInternalScroll(html: string): string {
  const lock =
    "<style id=\"coi-course-banner-lock\">html,body{overflow:hidden!important;overscroll-behavior:none;margin:0;}html{height:auto!important;min-height:0;}body{height:auto!important;min-height:min-content;}</style>";
  if (isFullHtmlDocument(html)) {
    const lower = html.toLowerCase();
    const headEnd = lower.indexOf("</head>");
    if (headEnd !== -1) {
      return `${html.slice(0, headEnd)}${lock}${html.slice(headEnd)}`;
    }
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${lock}<base target="_blank" rel="noopener noreferrer"/><style>html,body{margin:0;padding:0;overflow:hidden!important;overscroll-behavior:none;height:auto!important;}</style></head><body>${html}</body></html>`;
}

function measureIframeDocHeight(iframe: HTMLIFrameElement): number {
  const doc = iframe.contentDocument;
  const body = doc?.body;
  const root = doc?.documentElement;
  if (!body || !root) return 0;

  let h = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    Math.ceil(body.getBoundingClientRect().height),
    root.scrollHeight,
    root.offsetHeight,
    root.clientHeight,
    Math.ceil(root.getBoundingClientRect().height),
  );

  const splash = doc.getElementById("splash-container");
  if (splash) {
    h = Math.max(
      h,
      splash.scrollHeight,
      splash.offsetHeight,
      Math.ceil(splash.getBoundingClientRect().height),
    );
  }

  return h;
}

export default function CourseBrandedHeader({ course, className = "" }: CourseBrandedHeaderProps) {
  const header = course.courseBrandingHeader;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const delayedRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [embedHeight, setEmbedHeight] = useState<number | null>(null);

  const srcDoc = useMemo(() => {
    if (!header || header.kind !== "embed") return "";
    const raw = header.html;
    if (isFullHtmlDocument(raw)) return withNoInternalScroll(raw);
    return withNoInternalScroll(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><base target="_blank" rel="noopener noreferrer"/><style>html,body{margin:0;padding:0;overflow:hidden!important;overscroll-behavior:none;height:auto!important;}</style></head><body>${raw}</body></html>`,
    );
  }, [header]);

  const syncEmbedHeight = useCallback(() => {
    const el = iframeRef.current;
    if (!el) return;
    const h = measureIframeDocHeight(el);
    if (h <= 0) return;
    const padded = h + 32;
    // Prefer the largest measurement so late-loading fonts/CSS don’t clip the bottom; small buffer for subpixel/layout.
    setEmbedHeight((prev) => Math.max(prev ?? 0, padded));
  }, []);

  useEffect(() => {
    if (!header || header.kind !== "embed" || !srcDoc) return;

    roRef.current?.disconnect();
    roRef.current = null;
    delayedRef.current.forEach(clearTimeout);
    delayedRef.current = [];
    setEmbedHeight(null);

    const iframe = iframeRef.current;
    if (!iframe) return;

    const scheduleRemeasures = () => {
      delayedRef.current.push(setTimeout(syncEmbedHeight, 50));
      delayedRef.current.push(setTimeout(syncEmbedHeight, 200));
      delayedRef.current.push(setTimeout(syncEmbedHeight, 600));
      delayedRef.current.push(setTimeout(syncEmbedHeight, 1500));
    };

    const attach = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;

      syncEmbedHeight();
      requestAnimationFrame(() => {
        syncEmbedHeight();
        requestAnimationFrame(syncEmbedHeight);
      });

      const fontsReady = doc.fonts?.ready;
      if (fontsReady) {
        void fontsReady.then(() => syncEmbedHeight());
      }

      scheduleRemeasures();

      roRef.current?.disconnect();
      const ro = new ResizeObserver(() => syncEmbedHeight());
      ro.observe(doc.body);
      ro.observe(doc.documentElement);
      roRef.current = ro;
    };

    iframe.addEventListener("load", attach);
    if (iframe.contentDocument?.readyState === "complete") {
      attach();
    }

    return () => {
      iframe.removeEventListener("load", attach);
      roRef.current?.disconnect();
      roRef.current = null;
      delayedRef.current.forEach(clearTimeout);
      delayedRef.current = [];
    };
  }, [header, srcDoc, syncEmbedHeight]);

  if (!header) return null;

  const shell = `relative w-full ${className}`;

  if (header.kind === "image") {
    return (
      <div className={shell} aria-label="Course branding">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary course owner URLs */}
          <img
            src={header.imageUrl}
            alt={header.alt || `${course.title} banner`}
            className="pointer-events-none block h-auto w-full max-w-none"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36 bg-gradient-to-t from-[var(--neutral-100)] via-[var(--neutral-100)]/70 to-transparent"
          aria-hidden
        />
      </div>
    );
  }

  const pxHeight = embedHeight && embedHeight > 0 ? embedHeight : null;
  /** Generous default until measurement catches external CSS/fonts (Mantis loads remote stylesheets). */
  const iframeHeightPx = pxHeight ?? 520;

  return (
    <div className={shell} aria-label="Course branding">
      <div className="relative w-full min-h-[min(50vh,520px)]">
        <iframe
          ref={iframeRef}
          key={`${course.id}-embed-${srcDoc.length}`}
          title={`${course.title} branding`}
          className="pointer-events-none block w-full border-0 bg-transparent"
          style={{
            height: iframeHeightPx,
            minHeight: "min(50vh, 520px)",
            overflow: "hidden",
            display: "block",
          }}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          scrolling="no"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36 bg-gradient-to-t from-[var(--neutral-100)] via-[var(--neutral-100)]/70 to-transparent"
        aria-hidden
      />
    </div>
  );
}
