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

/** Shown at the top of the course page (channel-style). Image is a simple banner; embed is HTML/JS in a sandboxed iframe. */
export type CourseBrandingHeader =
  | { kind: "image"; imageUrl: string; alt?: string }
  | { kind: "embed"; html: string };

/** Shown at the bottom of the course (and lesson) pages. All fields optional; links need both label and URL. */
export interface CourseBrandingFooter {
  /** Plain email; rendered as a mailto link. */
  outreachEmail?: string;
  logoUrl?: string;
  logoAlt?: string;
  primaryLinkLabel?: string;
  primaryLinkUrl?: string;
  secondaryLinkLabel?: string;
  secondaryLinkUrl?: string;
  /** Short plain-text note (e.g. office hours, support copy). */
  customLine?: string;
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
  /** Thumbnail for course list cards; falls back to branding header image when unset. */
  coverImageUrl?: string;
  courseBrandingHeader?: CourseBrandingHeader;
  courseBrandingFooter?: CourseBrandingFooter;
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
  /** Admin analytics: template slots matched by scanning lesson projects (vs stored unlock events only). */
  derivedUnlockSlotCount?: number;
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
