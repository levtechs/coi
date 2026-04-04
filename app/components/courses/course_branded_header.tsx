"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Course } from "@/lib/types/course";
import { hashString } from "@/lib/hashString";

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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${lock}<base target="_blank"/><style>html,body{margin:0;padding:0;overflow:hidden!important;overscroll-behavior:none;height:auto!important;}</style></head><body>${html}</body></html>`;
}

/**
 * Prefer a known hero root when present (e.g. Mantis `#splash-container`); otherwise use
 * document scroll metrics without mixing in getBoundingClientRect on html (avoids runaway
 * sizes when the iframe has already been stretched tall).
 */
function measureIframeDocHeight(iframe: HTMLIFrameElement): number {
  const doc = iframe.contentDocument;
  const body = doc?.body;
  const root = doc?.documentElement;
  if (!body || !root) return 0;

  const splash = doc.getElementById("splash-container");
  if (splash) {
    return Math.ceil(
      Math.max(splash.scrollHeight, splash.offsetHeight, splash.getBoundingClientRect().height),
    );
  }

  return Math.ceil(
    Math.max(body.scrollHeight, body.offsetHeight, root.scrollHeight, root.offsetHeight),
  );
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
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><base target="_blank"/><style>html,body{margin:0;padding:0;overflow:hidden!important;overscroll-behavior:none;height:auto!important;}</style></head><body>${raw}</body></html>`,
    );
  }, [header]);

  const srcDocKey = useMemo(() => (srcDoc ? hashString(srcDoc) : ""), [srcDoc]);

  const syncEmbedHeight = useCallback(() => {
    const el = iframeRef.current;
    if (!el) return;
    const h = measureIframeDocHeight(el);
    if (h <= 0) return;
    const padded = h + 20;
    const cap =
      typeof window !== "undefined" ? Math.max(480, Math.round(window.innerHeight * 0.72)) : 720;
    const next = Math.min(padded, cap);
    // Replace (not monotonic max): a tall iframe + root metrics can otherwise lock in huge heights.
    setEmbedHeight((prev) => (prev !== null && Math.abs(prev - next) < 2 ? prev : next));
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
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[var(--neutral-100)] from-25% via-[var(--neutral-100)]/55 to-transparent"
          aria-hidden
        />
      </div>
    );
  }

  const pxHeight = embedHeight && embedHeight > 0 ? embedHeight : null;
  /** Short placeholder until measure runs; avoid 50vh minimum (felt like a huge empty band). */
  const iframeHeightPx = pxHeight ?? 380;

  return (
    <div className={shell} aria-label="Course branding">
      <div className="relative w-full min-h-[260px] overflow-hidden">
        <iframe
          ref={iframeRef}
          key={`${course.id}-embed-${srcDocKey}`}
          title={`${course.title} branding`}
          className="pointer-events-none block w-full border-0 bg-transparent"
          style={{
            height: iframeHeightPx,
            minHeight: 260,
            overflow: "hidden",
            display: "block",
          }}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          scrolling="no"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[var(--neutral-100)] from-25% via-[var(--neutral-100)]/55 to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}
