import { adminDb } from "@/lib/firebaseAdmin";
import { canAccessCourse, normalizeTutorPromptConfig } from "@/app/api/courses/helpers";
import { loadCourseResourcesForTutorGrounding } from "@/app/api/courses/course_resources_firestore";
import { formatTutorProfileIdsForContext } from "@/lib/tutor_prompt_profiles";
import type { CourseLesson, CourseResource, TutorPromptConfig } from "@/lib/types/course";
import type { Project } from "@/lib/types/project";

/** Cap total grounding payload so very large reference corpora do not blow model limits. Reference sections are listed first so truncation keeps facts over pedagogy. */
const MAX_TUTOR_GROUNDING_UTF8_BYTES = 900_000;

function mergeTutorConfig(
  courseDefaults: TutorPromptConfig | undefined,
  lessonOverride: TutorPromptConfig | undefined,
): TutorPromptConfig | undefined {
  if (!courseDefaults && !lessonOverride) return undefined;
  const c = courseDefaults || {};
  const l = lessonOverride || {};
  const profileIds = [...(l.profileIds?.length ? l.profileIds : c.profileIds || [])];
  const customParts: string[] = [];
  if (c.customInstruction?.trim()) customParts.push(c.customInstruction.trim());
  if (l.customInstruction?.trim()) customParts.push(l.customInstruction.trim());
  const customInstruction = customParts.length > 0 ? customParts.join("\n\n") : undefined;
  const out: TutorPromptConfig = {};
  if (profileIds.length > 0) out.profileIds = profileIds;
  if (customInstruction) out.customInstruction = customInstruction;
  return Object.keys(out).length > 0 ? out : undefined;
}

function referenceSections(resources: CourseResource[] | undefined, label: string): string {
  if (!resources?.length) return "";
  const parts: string[] = [];
  for (const r of resources) {
    if (r.includeInTutorReference !== true) continue;
    const text = r.referenceText?.trim();
    if (!text) continue;
    parts.push(`### ${label}: ${r.title}\n\n${text}`);
  }
  return parts.length > 0 ? parts.join("\n\n---\n\n") : "";
}

function truncateUtf8ToLimit(text: string, maxBytes: number): string {
  const suffix = "\n\n[…truncated for model context limit…]";
  const maxBody = maxBytes - Buffer.byteLength(suffix, "utf8");
  if (maxBody <= 0) return suffix.trim();
  if (Buffer.byteLength(text, "utf8") <= maxBody) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (Buffer.byteLength(text.slice(0, mid), "utf8") <= maxBody) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + suffix;
}

/**
 * Builds text appended to the tutor system instruction for course lesson projects.
 * Returns null if not a course project or if course cannot be loaded.
 */
export async function buildCourseTutorGroundingContext(uid: string, project: Project): Promise<string | null> {
  const courseId = project.courseId;
  if (!courseId || !project.courseLesson) {
    return null;
  }

  const courseSnap = await adminDb.collection("courses").doc(courseId).get();
  if (!courseSnap.exists) {
    return null;
  }

  const courseData = courseSnap.data() || {};
  if (!canAccessCourse(courseData, uid, true)) {
    return null;
  }

  const tutorDefaults = normalizeTutorPromptConfig(courseData.tutorDefaults);
  const lesson = project.courseLesson as CourseLesson;

  const mergedTutor = mergeTutorConfig(tutorDefaults, lesson.tutorConfig);

  let courseResources: CourseResource[] = [];
  try {
    courseResources = await loadCourseResourcesForTutorGrounding(courseId);
  } catch (err) {
    console.error("buildCourseTutorGroundingContext: loadCourseResourcesForTutorGrounding failed", err);
  }

  const chunks: string[] = [];

  const courseRefBlock = referenceSections(courseResources, "Course resource");
  if (courseRefBlock) {
    chunks.push("## Course reference materials\n\n" + courseRefBlock);
  }

  const lessonRefBlock = referenceSections(lesson.resources, "Lesson resource");
  if (lessonRefBlock) {
    chunks.push("## Lesson reference materials\n\n" + lessonRefBlock);
  }

  if (mergedTutor?.customInstruction) {
    chunks.push("## Tutor instructions (course and lesson)\n\n" + mergedTutor.customInstruction);
  }

  const profileText = formatTutorProfileIdsForContext(mergedTutor?.profileIds);
  if (profileText) {
    chunks.push("## Tutor behavior profiles (follow these tendencies)\n\n" + profileText);
  }

  if (chunks.length === 0) {
    return null;
  }

  const body =
    "The following context is authoritative for this course lesson. For factual questions about the product, people, and documentation, treat the reference material sections below as primary sources. Tutor instructions and behavior profiles govern tone and pedagogy.\n\n" +
    chunks.join("\n\n---\n\n");

  return truncateUtf8ToLimit(body, MAX_TUTOR_GROUNDING_UTF8_BYTES);
}
