import { Course } from "@/lib/types/course";

/** Cover image for list cards: explicit cover, else image-style branding header. */
export function courseListCoverUrl(course: Course): string | undefined {
  if (course.coverImageUrl) return course.coverImageUrl;
  if (course.courseBrandingHeader?.kind === "image") return course.courseBrandingHeader.imageUrl;
  return undefined;
}
