/** Staff-only analytics rollups returned from GET /api/courses/[courseId]/analytics */

export interface CourseAnalyticsQuizQuestionStat {
  questionIndex: number;
  questionSnippet: string;
  attemptCount: number;
  wrongCount: number;
  /** 0–100 */
  wrongPercent: number;
}

export interface CourseAnalyticsQuizRollup {
  quizId: string;
  title: string;
  lessonId?: string;
  questionStats: CourseAnalyticsQuizQuestionStat[];
  totalAttempts: number;
  distinctStudents: number;
  medianElapsedMs: number | null;
}

export interface CourseAnalyticsUnlockSlotRollup {
  cardId: string;
  title: string;
  unlockedByCount: number;
  /** Students with any progress row for this lesson */
  studentsStartedLesson: number;
}

export interface CourseAnalyticsLessonTimingRollup {
  lessonId: string;
  lessonIndex: number;
  lessonTitle: string;
  completedCount: number;
  startedCount: number;
  /** Median ms from startedAt to completedAt for students who completed */
  medianMsToComplete: number | null;
}

export interface CourseAnalyticsRollups {
  quizzes: CourseAnalyticsQuizRollup[];
  unlocksByLesson: Record<string, CourseAnalyticsUnlockSlotRollup[]>;
  lessonTiming: CourseAnalyticsLessonTimingRollup[];
}
