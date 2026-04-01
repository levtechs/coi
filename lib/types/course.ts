import { Card, NewCard } from "@/lib/types/cards";
import { ContentHierarchy } from "@/lib/types/content";
import { TimestampType } from "@/lib/types/timestamp";
import { QuizAttemptSummary } from "@/lib/types/quiz";

export type CourseCategory = "math" | "science" | "history" | "health" | "business" | "life skills" | "social studies" | "computer science" | "other";

export type TutorPromptProfileId =
  | "course_credibility"
  | "guided_practice"
  | "visual_verification"
  | "socratic_unlocking"
  | "comparative_reasoning"
  | "troubleshooting_reflection";

export interface TutorPromptConfig {
  profileIds?: TutorPromptProfileId[];
  customInstruction?: string;
}

export interface LessonGuide {
  body: string;
}

export type CourseResourceKind = "image" | "pdf" | "video" | "link" | "markdown";

export interface CourseResource {
  id?: string;
  title: string;
  url: string;
  kind: CourseResourceKind;
  caption?: string;
  mimeType?: string;
  sourceFileName?: string;
  size?: number;
  storagePath?: string;
  referenceText?: string;
  includeInTutorReference?: boolean;
  studentVisible?: boolean;
}

export interface TemplateMessage {
  content: string;
  isResponse: boolean;
  followUpQuestions?: string[];
}

export interface LessonProjectTemplate {
  title?: string;
  hierarchy?: ContentHierarchy;
  cards?: NewCard[];
  messages?: TemplateMessage[];
  shareWithOwner?: boolean;
  shareWithStaff?: boolean;
}

export interface CourseUnlockCard extends Card {
  unlockInstruction?: string;
}

export interface NewCourseUnlockCard extends NewCard {
  unlockInstruction?: string;
}

/** Per-quiz rule for unlocking the portfolio report. Missing quizId => optional (does not block). */
export interface CourseQuizReportPolicyEntry {
  optional: boolean;
  /** Required when optional is false; student best attempt must be >= this percent. */
  minPercent?: number;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  lessons: CourseLesson[];
  quizIds?: string[];
  /** Maps quiz id -> policy for report completion gate. */
  quizReportPolicy?: Record<string, CourseQuizReportPolicyEntry>;
  public?: boolean;
  sharedWith?: string[];
  staffIds?: string[];
  category?: CourseCategory;
  ownerId?: string;
  tutorDefaults?: TutorPromptConfig;
  resources?: CourseResource[];
}

export interface CourseLesson {
  id: string;
  courseId: string;
  index: number;
  title: string;
  description: string;
  content: string;
  guide?: LessonGuide;
  tutorConfig?: TutorPromptConfig;
  resources?: CourseResource[];
  baseProjectTemplate?: LessonProjectTemplate;
  cardsToUnlock: CourseUnlockCard[];
  quizIds?: string[];
  /** When true, lesson is not required for portfolio report completion. */
  optional?: boolean;
}

export interface CourseStudentLessonProgress {
  lessonId: string;
  lessonIndex: number;
  projectIds: string[];
  unlockedCardIds: string[];
  completedAt?: TimestampType;
  startedAt?: TimestampType;
  lastProjectId?: string;
  latestQuizAttempt?: QuizAttemptSummary | null;
  bestQuizAttempt?: QuizAttemptSummary | null;
}

export interface CourseStudentProgress {
  userId: string;
  email?: string;
  displayName?: string;
  joinedAt?: TimestampType;
  lastActiveAt?: TimestampType;
  completedLessonsCount?: number;
  lessonProgress?: Record<string, CourseStudentLessonProgress>;
  latestCourseQuizAttempt?: QuizAttemptSummary | null;
  bestCourseQuizAttempt?: QuizAttemptSummary | null;
  portfolioReportLatestId?: string;
  portfolioReportGeneratedAt?: string;
}

export interface CoursePortfolioReportSummary {
  id: string;
  generatedAt: string;
}

/** Saved portfolio report snapshot under courses/{courseId}/students/{uid}/portfolioReports/{id} */
export interface CoursePortfolioReportDoc {
  markdown: string;
  generatedAt: string;
  schemaVersion?: number;
}

export interface CoursePortfolioReportRecord extends CoursePortfolioReportDoc {
  id: string;
}

export type NewLesson = Omit<CourseLesson, "id" | "courseId" | "cardsToUnlock"> & { cardsToUnlock: NewCourseUnlockCard[] };
export type NewCourse = Omit<Course, "id" | "lessons"> & { lessons: NewLesson[] };
