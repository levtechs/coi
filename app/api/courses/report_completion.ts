import { fetchCardsFromProjectsWithAllSettled, getCardSignatureForUnlockMatch } from "@/app/api/cards/helpers";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchQuizAttemptsForUser } from "@/app/api/quiz/[quizId]/helpers";
import { Course, CourseLesson, CourseQuizReportPolicyEntry, CourseStudentLessonProgress, CourseStudentProgress } from "@/lib/types/course";

async function loadLessonProjectIds(courseId: string, lessonId: string, uid: string): Promise<string[]> {
  const snap = await adminDb
    .collection("projects")
    .where("courseId", "==", courseId)
    .where("ownerId", "==", uid)
    .where("courseLesson.id", "==", lessonId)
    .get();
  return snap.docs.map((d) => d.id);
}

async function lessonCardsSatisfiedFromProjects(
  lesson: CourseLesson,
  projectIds: string[],
): Promise<boolean> {
  if (lesson.cardsToUnlock.length === 0) {
    return projectIds.length > 0;
  }

  const requiredSignatures = new Set(lesson.cardsToUnlock.map(getCardSignatureForUnlockMatch));
  if (requiredSignatures.size === 0) {
    return false;
  }

  const requiredList = [...requiredSignatures];
  const byProject = await fetchCardsFromProjectsWithAllSettled(projectIds);

  for (const [, cards] of byProject) {
    const unlockedSignatures = new Set(
      cards
        .filter((card) => card.isUnlocked)
        .map(getCardSignatureForUnlockMatch),
    );
    const isComplete = requiredList.every((signature) => unlockedSignatures.has(signature));
    if (isComplete) {
      return true;
    }
  }

  return false;
}

export function collectAllQuizIds(course: Course): string[] {
  const ids = new Set<string>();
  (course.quizIds || []).forEach((id) => ids.add(id));
  for (const lesson of course.lessons) {
    (lesson.quizIds || []).forEach((id) => ids.add(id));
  }
  return [...ids];
}

export function getQuizReportPolicy(
  quizId: string,
  policyMap: Record<string, CourseQuizReportPolicyEntry> | undefined,
): CourseQuizReportPolicyEntry {
  const p = policyMap?.[quizId];
  if (!p) return { optional: true };
  return p;
}

function lessonCardsSatisfiedFromStored(lesson: CourseLesson, lp: CourseStudentLessonProgress | undefined): boolean {
  const n = lesson.cardsToUnlock.length;
  if (n === 0) {
    return !!(lp?.startedAt || (lp?.projectIds && lp.projectIds.length > 0));
  }
  if (lp?.completedAt) return true;
  const unlocked = lp?.unlockedCardIds?.length ?? 0;
  return unlocked >= n;
}

async function lessonSatisfiedForReport(
  lesson: CourseLesson,
  courseId: string,
  uid: string,
  lp: CourseStudentLessonProgress | undefined,
): Promise<boolean> {
  if (lessonCardsSatisfiedFromStored(lesson, lp)) return true;

  // Always union stored ids with all Firestore projects for this lesson. Relying only on
  // lessonProgress.projectIds misses completed work after a restart (new project id in
  // progress while an older project still satisfies cards) or any historical partial writes.
  const fromDb = await loadLessonProjectIds(courseId, lesson.id, uid);
  const stored = lp?.projectIds || [];
  const projectIds = [...new Set([...stored, ...fromDb])];

  return lessonCardsSatisfiedFromProjects(lesson, projectIds);
}

/**
 * Scan lesson project cards for admin analytics / rollups. Matches report eligibility: one project
 * must contain all required unlock signatures for allRequiredUnlocked.
 */
export async function deriveLessonProgressFromProjectsForAnalytics(
  lesson: CourseLesson,
  projectIds: string[],
): Promise<{
  allRequiredUnlocked: boolean;
  displayUnlockedCount: number;
  matchingUnlockedProjectCardIds: string[];
}> {
  if (projectIds.length === 0) {
    return { allRequiredUnlocked: false, displayUnlockedCount: 0, matchingUnlockedProjectCardIds: [] };
  }

  const byProject = await fetchCardsFromProjectsWithAllSettled(projectIds);

  if (lesson.cardsToUnlock.length === 0) {
    return { allRequiredUnlocked: true, displayUnlockedCount: 0, matchingUnlockedProjectCardIds: [] };
  }

  const requiredUnique = [...new Set(lesson.cardsToUnlock.map(getCardSignatureForUnlockMatch))];
  if (requiredUnique.length === 0) {
    return { allRequiredUnlocked: false, displayUnlockedCount: 0, matchingUnlockedProjectCardIds: [] };
  }

  let allRequiredUnlocked = false;
  const matchingUnlockedProjectCardIds: string[] = [];

  for (const [, cards] of byProject) {
    const unlockedSignatures = new Set(
      cards.filter((c) => c.isUnlocked).map(getCardSignatureForUnlockMatch),
    );
    if (requiredUnique.every((s) => unlockedSignatures.has(s))) {
      allRequiredUnlocked = true;
      const seenSig = new Set<string>();
      for (const t of lesson.cardsToUnlock) {
        const sig = getCardSignatureForUnlockMatch(t);
        const c = cards.find(
          (x) => x.isUnlocked && getCardSignatureForUnlockMatch(x) === sig,
        );
        if (c && !seenSig.has(sig)) {
          seenSig.add(sig);
          matchingUnlockedProjectCardIds.push(c.id);
        }
      }
      break;
    }
  }

  let displayUnlockedCount = 0;
  for (const [, cards] of byProject) {
    const unlockedSignatures = new Set(
      cards.filter((c) => c.isUnlocked).map(getCardSignatureForUnlockMatch),
    );
    const slots = lesson.cardsToUnlock.filter((t) =>
      unlockedSignatures.has(getCardSignatureForUnlockMatch(t)),
    ).length;
    displayUnlockedCount = Math.max(displayUnlockedCount, slots);
  }

  return { allRequiredUnlocked, displayUnlockedCount, matchingUnlockedProjectCardIds };
}

async function quizGateSatisfied(
  course: Course,
  uid: string,
): Promise<{ ok: boolean; reason?: string }> {
  const policyMap = course.quizReportPolicy;
  const quizIds = collectAllQuizIds(course);
  for (const quizId of quizIds) {
    const policy = getQuizReportPolicy(quizId, policyMap);
    if (policy.optional) continue;
    const attempts = await fetchQuizAttemptsForUser(quizId, uid);
    if (attempts.length === 0) {
      return { ok: false, reason: `Required quiz not attempted (${quizId}).` };
    }
    const best = [...attempts].sort((a, b) => b.percentScore - a.percentScore)[0];
    const minP = policy.minPercent ?? 70;
    if (best.percentScore < minP) {
      return { ok: false, reason: `Quiz score below required minimum (${minP}%): ${quizId}.` };
    }
  }
  return { ok: true };
}

/**
 * Returns whether the student may generate a portfolio report for this course.
 */
export async function isCourseCompletedForReport(
  course: Course,
  student: CourseStudentProgress | null,
  uid: string,
): Promise<{ eligible: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  const requiredLessons = course.lessons.filter((l) => !l.optional).sort((a, b) => a.index - b.index);

  if (requiredLessons.length === 0) {
    return { eligible: false, reasons: ["Course has no required lessons."] };
  }

  const lpMap = student?.lessonProgress || {};

  for (const lesson of requiredLessons) {
    const lp = lpMap[lesson.id];
    const ok = await lessonSatisfiedForReport(lesson, course.id, uid, lp);
    if (!ok) {
      reasons.push(`Lesson "${lesson.title}" is not fully complete.`);
    }
  }

  const quizCheck = await quizGateSatisfied(course, uid);
  if (!quizCheck.ok && quizCheck.reason) {
    reasons.push(quizCheck.reason);
  }

  return { eligible: reasons.length === 0, reasons };
}
