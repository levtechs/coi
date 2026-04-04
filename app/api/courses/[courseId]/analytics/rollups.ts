import { adminDb } from "@/lib/firebaseAdmin";
import { fetchQuiz } from "@/app/api/quiz/[quizId]/helpers";
import { Course, CourseLesson, CourseStudentProgress } from "@/lib/types/course";
import {
  CourseAnalyticsLessonTimingRollup,
  CourseAnalyticsQuizQuestionStat,
  CourseAnalyticsQuizRollup,
  CourseAnalyticsRollups,
  CourseAnalyticsUnlockSlotRollup,
} from "@/lib/types/course_analytics";
import { Quiz, QuizAttempt, QuizQuestion } from "@/lib/types/quiz";
import { timestampToMillis } from "@/app/api/courses/[courseId]/analytics/timestamp_ms";

const QUIZ_ROLLUP_CONCURRENCY = 5;

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function questionSnippet(q: QuizQuestion, maxLen = 120): string {
  const text = q.question.replace(/\s+/g, " ").trim();
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
}

export function collectCourseQuizIds(course: Course): string[] {
  const ids = new Set<string>();
  for (const id of course.quizIds || []) {
    if (typeof id === "string" && id) ids.add(id);
  }
  for (const lesson of course.lessons) {
    for (const id of lesson.quizIds || []) {
      if (typeof id === "string" && id) ids.add(id);
    }
  }
  return [...ids];
}

function quizIdToLessonId(course: Course): Map<string, string> {
  const map = new Map<string, string>();
  for (const lesson of course.lessons) {
    for (const qid of lesson.quizIds || []) {
      if (typeof qid === "string" && qid) map.set(qid, lesson.id);
    }
  }
  return map;
}

async function fetchAttemptsForCourseQuiz(quizId: string, courseId: string): Promise<QuizAttempt[]> {
  const attemptsRef = adminDb.collection("quizzes").doc(quizId).collection("attempts");
  const snap = await attemptsRef.where("courseId", "==", courseId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as QuizAttempt[];
}

function aggregateQuestionStats(quiz: Quiz, attempts: QuizAttempt[]): CourseAnalyticsQuizQuestionStat[] {
  const n = quiz.questions?.length ?? 0;
  if (n === 0) return [];

  const wrong = new Array(n).fill(0);
  const total = new Array(n).fill(0);

  for (const attempt of attempts) {
    const results = attempt.results || [];
    for (let i = 0; i < n; i++) {
      if (i >= results.length) continue;
      total[i] += 1;
      if (!results[i]?.isCorrect) wrong[i] += 1;
    }
  }

  return quiz.questions.map((q, i) => ({
    questionIndex: i,
    questionSnippet: questionSnippet(q),
    attemptCount: total[i]!,
    wrongCount: wrong[i]!,
    wrongPercent: total[i]! > 0 ? Math.round((wrong[i]! / total[i]!) * 1000) / 10 : 0,
  }));
}

async function buildQuizRollups(courseId: string, course: Course): Promise<CourseAnalyticsQuizRollup[]> {
  const quizIds = collectCourseQuizIds(course);
  const quizToLesson = quizIdToLessonId(course);

  const rollups = await mapPool(
    quizIds,
    QUIZ_ROLLUP_CONCURRENCY,
    async (quizId): Promise<CourseAnalyticsQuizRollup | null> => {
      let quiz: Quiz;
      try {
        quiz = await fetchQuiz(quizId);
      } catch {
        return null;
      }

      if (quiz.courseId && quiz.courseId !== courseId) {
        return null;
      }

      const attempts = await fetchAttemptsForCourseQuiz(quizId, courseId);
      if (attempts.length === 0) {
        return {
          quizId,
          title: quiz.title || "Quiz",
          lessonId: quiz.lessonId || quizToLesson.get(quizId),
          questionStats: aggregateQuestionStats(quiz, []),
          totalAttempts: 0,
          distinctStudents: 0,
          medianElapsedMs: null,
        };
      }

      const distinctStudents = new Set(attempts.map((a) => a.userId)).size;
      const elapsedList = attempts
        .map((a) => (typeof a.elapsedMs === "number" && Number.isFinite(a.elapsedMs) ? a.elapsedMs : null))
        .filter((v): v is number => v != null && v >= 0);

      return {
        quizId,
        title: quiz.title || "Quiz",
        lessonId: quiz.lessonId || quizToLesson.get(quizId),
        questionStats: aggregateQuestionStats(quiz, attempts),
        totalAttempts: attempts.length,
        distinctStudents,
        medianElapsedMs: median(elapsedList),
      };
    },
  );

  return rollups.filter((r): r is CourseAnalyticsQuizRollup => r !== null);
}

function buildUnlockRollups(lesson: CourseLesson, students: CourseStudentProgress[]): CourseAnalyticsUnlockSlotRollup[] {
  const cards = lesson.cardsToUnlock || [];
  if (cards.length === 0) return [];

  let studentsStartedLesson = 0;
  const unlockedByCard = new Map<string, number>();
  for (const c of cards) {
    unlockedByCard.set(c.id, 0);
  }

  for (const student of students) {
    const lp = student.lessonProgress?.[lesson.id];
    if (!lp) continue;
    studentsStartedLesson += 1;
    const unlocked = new Set(lp.unlockedCardIds || []);
    for (const card of cards) {
      if (unlocked.has(card.id)) {
        unlockedByCard.set(card.id, (unlockedByCard.get(card.id) || 0) + 1);
      }
    }
  }

  return cards.map((card) => ({
    cardId: card.id,
    title: card.title,
    unlockedByCount: unlockedByCard.get(card.id) || 0,
    studentsStartedLesson,
  }));
}

function buildLessonTimingRollups(course: Course, students: CourseStudentProgress[]): CourseAnalyticsLessonTimingRollup[] {
  return [...course.lessons]
    .sort((a, b) => a.index - b.index)
    .map((lesson) => {
      let startedCount = 0;
      let completedCount = 0;
      const durations: number[] = [];

      for (const student of students) {
        const lp = student.lessonProgress?.[lesson.id];
        if (!lp) continue;
        startedCount += 1;
        if (lp.completedAt) {
          completedCount += 1;
          const start = timestampToMillis(lp.startedAt);
          const end = timestampToMillis(lp.completedAt);
          if (start != null && end != null && end >= start) {
            durations.push(end - start);
          }
        }
      }

      return {
        lessonId: lesson.id,
        lessonIndex: lesson.index,
        lessonTitle: lesson.title,
        completedCount,
        startedCount,
        medianMsToComplete: median(durations),
      } satisfies CourseAnalyticsLessonTimingRollup;
    });
}

export async function buildCourseAnalyticsRollups(
  courseId: string,
  course: Course,
  students: CourseStudentProgress[],
): Promise<CourseAnalyticsRollups> {
  const [quizzes, lessonTiming] = await Promise.all([
    buildQuizRollups(courseId, course),
    Promise.resolve(buildLessonTimingRollups(course, students)),
  ]);

  const unlocksByLesson: Record<string, CourseAnalyticsUnlockSlotRollup[]> = {};
  for (const lesson of course.lessons) {
    const roll = buildUnlockRollups(lesson, students);
    if (roll.length > 0) {
      unlocksByLesson[lesson.id] = roll;
    }
  }

  return { quizzes, unlocksByLesson, lessonTiming };
}
