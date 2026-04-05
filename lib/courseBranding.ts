import { Course, CourseBrandingFooter } from "@/lib/types/course";

/** Cover image for list cards: explicit cover, else image-style branding header. */
export function courseListCoverUrl(course: Course): string | undefined {
  if (course.coverImageUrl) return course.coverImageUrl;
  if (course.courseBrandingHeader?.kind === "image") return course.courseBrandingHeader.imageUrl;
  return undefined;
}

const MAX_FOOTER_CUSTOM_LINE_CHARS = 500;
const MAX_FOOTER_STRING_CHARS = 2000;

function trimFooterString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeFooterExternalUrl(value: unknown): string | undefined {
  const t = trimFooterString(value, MAX_FOOTER_STRING_CHARS);
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return t;
  } catch {
    return undefined;
  }
  return undefined;
}

const OUTREACH_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOutreachEmail(value: unknown): string | undefined {
  const t = trimFooterString(value, 120)?.toLowerCase();
  if (!t || !OUTREACH_EMAIL_RE.test(t)) return undefined;
  return t;
}

/** Shared by API and course editor preview logic. */
export function normalizeCourseBrandingFooter(value: unknown): CourseBrandingFooter | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;

  const outreachEmail = normalizeOutreachEmail(v.outreachEmail);
  const logoUrl = normalizeFooterExternalUrl(v.logoUrl);
  const logoAlt = trimFooterString(v.logoAlt, 200);
  const pLabel = trimFooterString(v.primaryLinkLabel, 120);
  const pUrl = normalizeFooterExternalUrl(v.primaryLinkUrl);
  const sLabel = trimFooterString(v.secondaryLinkLabel, 120);
  const sUrl = normalizeFooterExternalUrl(v.secondaryLinkUrl);
  const customRaw = typeof v.customLine === "string" ? v.customLine.trim() : "";
  const customLine = customRaw ? customRaw.slice(0, MAX_FOOTER_CUSTOM_LINE_CHARS) : undefined;

  const primary =
    pLabel && pUrl ? { primaryLinkLabel: pLabel, primaryLinkUrl: pUrl } as const : {};
  const secondary =
    sLabel && sUrl ? { secondaryLinkLabel: sLabel, secondaryLinkUrl: sUrl } as const : {};

  const out: CourseBrandingFooter = {
    ...(outreachEmail ? { outreachEmail } : {}),
    ...(logoUrl ? { logoUrl, ...(logoAlt ? { logoAlt } : {}) } : {}),
    ...primary,
    ...secondary,
    ...(customLine ? { customLine } : {}),
  };

  return Object.keys(out).length > 0 ? out : undefined;
}

export function hasCourseBrandingFooterContent(footer?: CourseBrandingFooter): boolean {
  if (!footer) return false;
  return !!(
    footer.outreachEmail
    || footer.logoUrl
    || (footer.primaryLinkLabel && footer.primaryLinkUrl)
    || (footer.secondaryLinkLabel && footer.secondaryLinkUrl)
    || footer.customLine
  );
}
