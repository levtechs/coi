"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Course } from "@/lib/types/course";
import { hashString } from "@/lib/hashString";

type CourseBrandedHeaderProps = {
  course: Course;
  className?: string;
};

const COI_BANNER_HEIGHT_MSG = "__COI_BANNER_H__";

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

/** Injected into srcDoc so height is reported via postMessage (sandbox without allow-same-origin). */
function injectHeightReporter(html: string, nonce: string): string {
  const N = JSON.stringify(nonce);
  const T = JSON.stringify(COI_BANNER_HEIGHT_MSG);
  const script =
    `<script>(function(){var N=${N},T=${T};function measure(){var d=document,b=d.body,r=d.documentElement;if(!b||!r)return 0;var e=d.getElementById("splash-container");if(e)return Math.ceil(Math.max(e.scrollHeight,e.offsetHeight,e.getBoundingClientRect().height));return Math.ceil(Math.max(b.scrollHeight,b.offsetHeight,r.scrollHeight,r.offsetHeight));}function send(){var h=measure();if(h>0&&window.parent)window.parent.postMessage({type:T,h:h,nonce:N},"*");}send();document.addEventListener("DOMContentLoaded",send);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(send);try{var ro=new ResizeObserver(send);if(document.body)ro.observe(document.body);if(document.documentElement)ro.observe(document.documentElement);}catch(e){}setTimeout(send,50);setTimeout(send,200);setTimeout(send,600);setTimeout(send,1500);})();<\/script>`;
  const lower = html.toLowerCase();
  const i = lower.lastIndexOf("</body>");
  if (i !== -1) return `${html.slice(0, i)}${script}${html.slice(i)}`;
  return html + script;
}

export default function CourseBrandedHeader({ course, className = "" }: CourseBrandedHeaderProps) {
  const header = course.courseBrandingHeader;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const embedNonceSource =
    header?.kind === "embed" ? header.html : "";

  const embedNonce = useMemo(() => {
    void embedNonceSource;
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, [embedNonceSource]);

  const [embedHeight, setEmbedHeight] = useState<number | null>(null);

  const srcDoc = useMemo(() => {
    if (!header || header.kind !== "embed") return "";
    const raw = header.html;
    const wrapped = isFullHtmlDocument(raw)
      ? withNoInternalScroll(raw)
      : withNoInternalScroll(
          `<!DOCTYPE html><html><head><meta charset="utf-8"/><base target="_blank"/><style>html,body{margin:0;padding:0;overflow:hidden!important;overscroll-behavior:none;height:auto!important;}</style></head><body>${raw}</body></html>`,
        );
    return injectHeightReporter(wrapped, embedNonce);
  }, [header, embedNonce]);

  const srcDocKey = useMemo(() => (srcDoc ? hashString(srcDoc) : ""), [srcDoc]);

  const applyHeight = useCallback((h: number) => {
    if (!Number.isFinite(h) || h <= 0) return;
    const padded = h + 20;
    const cap =
      typeof window !== "undefined" ? Math.max(480, Math.round(window.innerHeight * 0.72)) : 720;
    const next = Math.min(padded, cap);
    setEmbedHeight((prev) => (prev !== null && Math.abs(prev - next) < 2 ? prev : next));
  }, []);

  useEffect(() => {
    if (!header || header.kind !== "embed" || !srcDoc || !embedNonce) return;

    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const data = ev.data as { type?: string; h?: unknown; nonce?: string };
      if (!data || data.type !== COI_BANNER_HEIGHT_MSG || data.nonce !== embedNonce) return;
      const h = typeof data.h === "number" ? data.h : Number(data.h);
      applyHeight(h);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [header, srcDoc, embedNonce, applyHeight]);

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
  /** Short placeholder until postMessage measure runs. */
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
          sandbox="allow-scripts"
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
