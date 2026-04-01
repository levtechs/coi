import {
  Course,
  CourseLesson,
  CourseQuizReportPolicyEntry,
  CourseResource,
  CourseUnlockCard,
  LessonGuide,
  TutorPromptConfig,
  TutorPromptProfileId,
} from "@/lib/types/course";
import { adminDb } from "@/lib/firebaseAdmin";
import { stripUndefinedDeep } from "@/lib/firestoreSanitize";

type CourseDocLike = Partial<Omit<Course, "id" | "lessons">> & { ownerId?: string; quizReportPolicy?: unknown };
type LessonDocLike = Partial<Omit<CourseLesson, "id" | "courseId" | "cardsToUnlock">> & { content?: string; optional?: boolean };

export function normalizeTutorPromptConfig(value: unknown): TutorPromptConfig | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as { profileIds?: unknown; customInstruction?: unknown };
  const profileIds = Array.isArray(raw.profileIds)
    ? [...new Set(raw.profileIds
      .filter((item): item is TutorPromptProfileId => typeof item === "string"))]
    : undefined;

  const customInstruction = typeof raw.customInstruction === "string" ? raw.customInstruction : undefined;

  if ((!profileIds || profileIds.length === 0) && !customInstruction) return undefined;

  return {
    ...(profileIds && profileIds.length > 0 ? { profileIds } : {}),
    ...(customInstruction ? { customInstruction } : {}),
  };
}

export function normalizeGuide(value: unknown, legacyContent?: unknown): LessonGuide | undefined {
  if (value && typeof value === "object") {
    const raw = value as { body?: unknown };
    if (typeof raw.body === "string" && raw.body.trim() !== "") {
      return { body: raw.body };
    }
  }

  if (typeof legacyContent === "string" && legacyContent.trim() !== "") {
    return { body: legacyContent };
  }

  return undefined;
}

export function normalizeResources(value: unknown): CourseResource[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is CourseResource => !!item && typeof item === "object" && typeof (item as CourseResource).title === "string" && typeof (item as CourseResource).url === "string" && typeof (item as CourseResource).kind === "string")
    .map((resource) => stripUndefinedDeep({
      id: resource.id,
      title: resource.title,
      url: resource.url,
      kind: resource.kind,
      caption: resource.caption,
      mimeType: resource.mimeType,
      sourceFileName: resource.sourceFileName,
      size: resource.size,
      storagePath: resource.storagePath,
      referenceText: resource.referenceText,
      includeInTutorReference: resource.includeInTutorReference,
      studentVisible: resource.studentVisible,
    }));
}

export function normalizeQuizReportPolicy(value: unknown): Record<string, CourseQuizReportPolicyEntry> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const out: Record<string, CourseQuizReportPolicyEntry> = {};
  for (const [quizId, entry] of Object.entries(raw)) {
    if (!quizId || typeof entry !== "object" || !entry) continue;
    const e = entry as { optional?: unknown; minPercent?: unknown };
    const optional = e.optional === true;
    const minPercent = typeof e.minPercent === "number" && Number.isFinite(e.minPercent)
      ? Math.max(0, Math.min(100, e.minPercent))
      : 70;
    out[quizId] = optional ? { optional: true } : { optional: false, minPercent };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function normalizeCardsToUnlock(value: unknown): CourseUnlockCard[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is CourseUnlockCard => !!item && typeof item === "object" && typeof (item as CourseUnlockCard).title === "string")
    .map((card) => stripUndefinedDeep({
      id: card.id,
      title: card.title,
      details: Array.isArray(card.details) ? card.details.filter((detail): detail is string => typeof detail === "string") : [],
      kind: card.kind,
      url: card.url,
      refImageUrls: card.refImageUrls,
      iconUrl: card.iconUrl,
      exclude: card.exclude,
      isUnlocked: card.isUnlocked,
      labels: card.labels,
      unlockInstruction: card.unlockInstruction,
    }));
}

export function normalizeCourseLesson(courseId: string, lessonId: string, lessonData: LessonDocLike, cardsToUnlock: CourseUnlockCard[]): CourseLesson {
  return {
    id: lessonId,
    courseId,
    index: typeof lessonData.index === "number" ? lessonData.index : 0,
    title: lessonData.title || "Untitled Lesson",
    description: lessonData.description || "",
    content: typeof lessonData.content === "string" ? lessonData.content : "",
    guide: normalizeGuide(lessonData.guide, lessonData.content),
    tutorConfig: normalizeTutorPromptConfig(lessonData.tutorConfig),
    resources: normalizeResources(lessonData.resources),
    baseProjectTemplate: lessonData.baseProjectTemplate,
    cardsToUnlock,
    quizIds: Array.isArray(lessonData.quizIds) ? lessonData.quizIds.filter((item): item is string => typeof item === "string") : [],
    optional: lessonData.optional === true,
  };
}

export function normalizeCourse(courseId: string, courseData: CourseDocLike, lessons: CourseLesson[]): Course {
  return {
    id: courseId,
    title: courseData.title || "Untitled Course",
    description: courseData.description,
    lessons,
    quizIds: Array.isArray(courseData.quizIds) ? courseData.quizIds.filter((item): item is string => typeof item === "string") : [],
    public: courseData.public === true,
    sharedWith: Array.isArray(courseData.sharedWith) ? courseData.sharedWith.filter((item): item is string => typeof item === "string") : [],
    staffIds: Array.isArray(courseData.staffIds) ? courseData.staffIds.filter((item): item is string => typeof item === "string") : [],
    category: courseData.category,
    ownerId: courseData.ownerId,
    tutorDefaults: normalizeTutorPromptConfig(courseData.tutorDefaults),
    resources: normalizeResources(courseData.resources),
    quizReportPolicy: normalizeQuizReportPolicy(courseData.quizReportPolicy),
  };
}

export function canAccessCourse(courseData: CourseDocLike, uid: string, allowPublic = false): boolean {
  return courseData.ownerId === uid
    || (Array.isArray(courseData.staffIds) && courseData.staffIds.includes(uid))
    || (Array.isArray(courseData.sharedWith) && courseData.sharedWith.includes(uid))
    || (allowPublic && courseData.public === true);
}

export function isCourseStaff(courseData: CourseDocLike, uid: string): boolean {
  return courseData.ownerId === uid || (Array.isArray(courseData.staffIds) && courseData.staffIds.includes(uid));
}

export function getCourseMemberIds(courseData: CourseDocLike): string[] {
  return [...new Set([
    courseData.ownerId,
    ...(Array.isArray(courseData.staffIds) ? courseData.staffIds : []),
    ...(Array.isArray(courseData.sharedWith) ? courseData.sharedWith : []),
  ].filter((item): item is string => !!item))];
}

export async function fetchCourseAndLessonContext(courseId: string, lessonId?: string): Promise<{ course: Course | null; lesson: CourseLesson | null }> {
  const courseRef = adminDb.collection("courses").doc(courseId);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) {
    return { course: null, lesson: null };
  }

  const lessonsRef = courseRef.collection("lessons");
  const lessonDocs = lessonId ? [await lessonsRef.doc(lessonId).get()] : [];
  const lessons = await Promise.all(
    (lessonId ? lessonDocs.filter((doc) => doc.exists) : await lessonsRef.get().then((snap) => snap.docs)).map(async (doc) => {
      const cardsSnap = await doc.ref.collection("cardsToUnlock").get();
      let cardsToUnlock = normalizeCardsToUnlock(cardsSnap.docs.map((cardDoc) => ({ id: cardDoc.id, ...cardDoc.data() })));
      if (cardsToUnlock.length === 0 && Array.isArray(doc.data()?.cardsToUnlock)) {
        cardsToUnlock = normalizeCardsToUnlock(doc.data()?.cardsToUnlock);
      }
      return normalizeCourseLesson(courseId, doc.id, doc.data() || {}, cardsToUnlock);
    }),
  );

  const course = normalizeCourse(courseId, courseSnap.data() || {}, lessons);
  return {
    course,
    lesson: lessonId ? lessons[0] || null : null,
  };
}
