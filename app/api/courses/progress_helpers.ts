import { adminDb } from "@/lib/firebaseAdmin";
import { CourseLesson, CoursePortfolioReportDoc, CoursePortfolioReportRecord, CoursePortfolioReportSummary, CourseStudentProgress } from "@/lib/types/course";
import { Quiz, QuizAttemptSummary } from "@/lib/types/quiz";
import { getUserById } from "@/app/api/users/helpers";

export function getStudentRef(courseId: string, uid: string) {
  return adminDb.collection("courses").doc(courseId).collection("students").doc(uid);
}

export async function fetchCourseStudentProgressForUser(
  courseId: string,
  uid: string,
): Promise<CourseStudentProgress | null> {
  const snap = await getStudentRef(courseId, uid).get();
  if (!snap.exists) return null;
  return { userId: uid, ...snap.data() } as CourseStudentProgress;
}

async function ensureStudentMetadata(courseId: string, uid: string) {
  const studentRef = getStudentRef(courseId, uid);
  const existingSnap = await studentRef.get();
  const student = await getUserById(uid);
  await studentRef.set({
    userId: uid,
    email: student?.email || null,
    displayName: student?.displayName || null,
    joinedAt: existingSnap.data()?.joinedAt || new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    lessonProgress: existingSnap.data()?.lessonProgress || {},
  }, { merge: true });
}

export async function recordLessonProjectStart(courseId: string, lesson: CourseLesson, uid: string, projectId: string) {
  await ensureStudentMetadata(courseId, uid);

  const studentRef = getStudentRef(courseId, uid);
  const lessonKey = `lessonProgress.${lesson.id}`;
  const existingSnap = await studentRef.get();
  const existingLesson = existingSnap.data()?.lessonProgress?.[lesson.id] || {};
  const existingProjectIds = (existingSnap.data()?.lessonProgress?.[lesson.id]?.projectIds || []) as string[];
  const mergedProjectIds = existingProjectIds.includes(projectId) ? existingProjectIds : [...existingProjectIds, projectId];
  const now = new Date().toISOString();
  const startedAt = existingLesson.startedAt || now;
  const shouldMarkComplete = lesson.cardsToUnlock.length === 0 && !existingLesson.completedAt;

  await studentRef.set({
    lastActiveAt: now,
    [`${lessonKey}.lessonId`]: lesson.id,
    [`${lessonKey}.lessonIndex`]: lesson.index,
    [`${lessonKey}.startedAt`]: startedAt,
    [`${lessonKey}.lastProjectId`]: projectId,
    [`${lessonKey}.projectIds`]: mergedProjectIds,
    [`${lessonKey}.unlockedCardIds`]: existingLesson.unlockedCardIds || [],
    ...((shouldMarkComplete) ? { [`${lessonKey}.completedAt`]: now } : {}),
  }, { merge: true });
}

export async function recordLessonCardUnlocks(courseId: string, lesson: CourseLesson, uid: string, unlockedCardIds: string[]) {
  if (unlockedCardIds.length === 0) return;

  await ensureStudentMetadata(courseId, uid);
  const studentRef = getStudentRef(courseId, uid);
  const snap = await studentRef.get();
  const existingLesson = (snap.data()?.lessonProgress?.[lesson.id] || {}) as {
    unlockedCardIds?: string[];
    completedAt?: string;
  };

  const mergedUnlocked = [...new Set([...(existingLesson.unlockedCardIds || []), ...unlockedCardIds])];
  const lessonKey = `lessonProgress.${lesson.id}`;
  const isComplete = lesson.cardsToUnlock.length === 0 || mergedUnlocked.length >= lesson.cardsToUnlock.length;

  await studentRef.set({
    lastActiveAt: new Date().toISOString(),
    [`${lessonKey}.lessonId`]: lesson.id,
    [`${lessonKey}.lessonIndex`]: lesson.index,
    [`${lessonKey}.unlockedCardIds`]: mergedUnlocked,
    ...((isComplete && !existingLesson.completedAt) ? { [`${lessonKey}.completedAt`]: new Date().toISOString() } : {}),
  }, { merge: true });
}

export async function recordQuizAttemptForCourseProgress(quiz: Quiz, uid: string, attempt: QuizAttemptSummary) {
  if (!quiz.courseId) return;

  await ensureStudentMetadata(quiz.courseId, uid);
  const studentRef = getStudentRef(quiz.courseId, uid);

  if (quiz.lessonId) {
    const snap = await studentRef.get();
    const lessonProgress = (snap.data()?.lessonProgress?.[quiz.lessonId] || {}) as {
      bestQuizAttempt?: QuizAttemptSummary | null;
    };
    const bestExisting = lessonProgress.bestQuizAttempt;
    const shouldReplaceBest = !bestExisting || attempt.percentScore >= bestExisting.percentScore;

    await studentRef.set({
      lastActiveAt: new Date().toISOString(),
      [`lessonProgress.${quiz.lessonId}.lessonId`]: quiz.lessonId,
      [`lessonProgress.${quiz.lessonId}.latestQuizAttempt`]: attempt,
      ...(shouldReplaceBest ? { [`lessonProgress.${quiz.lessonId}.bestQuizAttempt`]: attempt } : {}),
    }, { merge: true });
    return;
  }

  const studentSnap = await studentRef.get();
  const bestExisting = (studentSnap.data()?.bestCourseQuizAttempt || null) as QuizAttemptSummary | null;
  const shouldReplaceBest = !bestExisting || attempt.percentScore >= bestExisting.percentScore;

  await studentRef.set({
    lastActiveAt: new Date().toISOString(),
    latestCourseQuizAttempt: attempt,
    ...(shouldReplaceBest ? { bestCourseQuizAttempt: attempt } : {}),
  }, { merge: true });
}

export async function fetchCourseStudentProgress(courseId: string): Promise<CourseStudentProgress[]> {
  const snap = await adminDb.collection("courses").doc(courseId).collection("students").get();
  return snap.docs.map((doc) => ({
    userId: doc.id,
    ...doc.data(),
  })) as CourseStudentProgress[];
}

export async function savePortfolioReport(
  courseId: string,
  uid: string,
  markdown: string,
): Promise<{ id: string; generatedAt: string }> {
  const studentRef = getStudentRef(courseId, uid);
  const reportRef = studentRef.collection("portfolioReports").doc();
  const generatedAt = new Date().toISOString();
  const payload: CoursePortfolioReportDoc = { markdown, generatedAt, schemaVersion: 1 };
  await reportRef.set(payload);
  await studentRef.set(
    {
      portfolioReportLatestId: reportRef.id,
      portfolioReportGeneratedAt: generatedAt,
    },
    { merge: true },
  );
  return { id: reportRef.id, generatedAt };
}

export async function fetchLatestPortfolioReport(
  courseId: string,
  uid: string,
): Promise<CoursePortfolioReportRecord | null> {
  const studentRef = getStudentRef(courseId, uid);
  const snap = await studentRef.get();
  if (!snap.exists) return null;
  const latestId = snap.data()?.portfolioReportLatestId as string | undefined;
  if (!latestId) return null;
  const r = await studentRef.collection("portfolioReports").doc(latestId).get();
  if (!r.exists) return null;
  const d = r.data() as CoursePortfolioReportDoc;
  return { id: r.id, ...d };
}

export async function fetchPortfolioReports(
  courseId: string,
  uid: string,
): Promise<CoursePortfolioReportSummary[]> {
  const studentRef = getStudentRef(courseId, uid);
  const snap = await studentRef.collection("portfolioReports").orderBy("generatedAt", "desc").get();
  return snap.docs.map((doc) => {
    const data = doc.data() as CoursePortfolioReportDoc;
    return {
      id: doc.id,
      generatedAt: data.generatedAt,
    };
  });
}

export async function fetchPortfolioReportById(
  courseId: string,
  uid: string,
  reportId: string,
): Promise<CoursePortfolioReportRecord | null> {
  const reportSnap = await getStudentRef(courseId, uid).collection("portfolioReports").doc(reportId).get();
  if (!reportSnap.exists) return null;
  return {
    id: reportSnap.id,
    ...(reportSnap.data() as CoursePortfolioReportDoc),
  };
}
