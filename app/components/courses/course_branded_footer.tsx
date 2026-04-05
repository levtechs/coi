"use client";

import { CourseBrandingFooter } from "@/lib/types/course";
import { hasCourseBrandingFooterContent } from "@/lib/courseBranding";

type CourseBrandedFooterProps = {
  footer: CourseBrandingFooter | undefined;
  courseTitle: string;
  className?: string;
};

const linkBtn =
  "inline-flex items-center justify-center rounded-lg border border-[var(--neutral-300)] bg-[var(--neutral-100)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent-100)] hover:border-[var(--accent-300)] transition-colors";

export default function CourseBrandedFooter({ footer, courseTitle, className = "" }: CourseBrandedFooterProps) {
  if (!footer || !hasCourseBrandingFooterContent(footer)) return null;

  return (
    <footer
      className={`border-t border-[var(--neutral-300)] bg-[var(--neutral-200)]/90 px-6 py-8 ${className}`}
      aria-label="Course footer"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {footer.logoUrl && (
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- course owner URL */}
              <img
                src={footer.logoUrl}
                alt={footer.logoAlt || `${courseTitle} logo`}
                className="h-11 w-auto max-w-[200px] object-contain object-left"
              />
            </div>
          )}
          <div className="min-w-0 space-y-2">
            {footer.customLine && (
              <p className="text-sm leading-relaxed text-[var(--neutral-700)] whitespace-pre-wrap">{footer.customLine}</p>
            )}
            {footer.outreachEmail && (
              <p className="text-sm text-[var(--neutral-600)]">
                <span className="font-medium text-[var(--foreground)]">Email </span>
                <a
                  className="text-[var(--accent-600)] underline underline-offset-2 hover:text-[var(--accent-500)]"
                  href={`mailto:${footer.outreachEmail}`}
                >
                  {footer.outreachEmail}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap gap-3">
          {footer.primaryLinkLabel && footer.primaryLinkUrl && (
            <a
              href={footer.primaryLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkBtn} border-[var(--accent-400)] bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] hover:border-[var(--accent-500)]`}
            >
              {footer.primaryLinkLabel}
            </a>
          )}
          {footer.secondaryLinkLabel && footer.secondaryLinkUrl && (
            <a href={footer.secondaryLinkUrl} target="_blank" rel="noopener noreferrer" className={linkBtn}>
              {footer.secondaryLinkLabel}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
