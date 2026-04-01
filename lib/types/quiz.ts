import { TimestampType } from "@/lib/types/timestamp";

export type QuizSourceType = "project" | "lesson" | "course" | "manual";

export type QuizQuestion = {
  type: "MCQ";
  question: string;
  content: {
    options: string[];
    correctOptionIndex: number;
  };
} | {
  type: "FRQ";
  question: string;
  content: {
    gradingCriteria: string;
    exampleAnswer: string;
  };
};

export interface Quiz {
  id?: string;
  createdAt?: TimestampType;
  description: string;
  questions: QuizQuestion[];
  title: string;
  createdBy?: string;
  sourceType?: QuizSourceType;
  projectId?: string;
  courseId?: string;
  lessonId?: string;
  gradedOnly?: boolean;
  attemptCount?: number;
  completedByCount?: number;
  highestScore?: number;
  averageScore?: number;
  latestAttempt?: QuizAttemptSummary | null;
  bestAttempt?: QuizAttemptSummary | null;
  attempts?: QuizAttemptSummary[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: (number | string)[];
  results: { isCorrect: boolean; score: number; correctAnswer: string; feedback?: string }[];
  totalScore: number;
  maxScore: number;
  percentScore: number;
  startedAt?: TimestampType;
  submittedAt: TimestampType;
  elapsedMs?: number;
  attemptNumber: number;
  courseId?: string;
  lessonId?: string;
  projectId?: string;
}

export interface QuizAttemptSummary {
  id: string;
  totalScore: number;
  maxScore: number;
  percentScore: number;
  submittedAt: TimestampType;
  attemptNumber: number;
}

export interface QuizSettings {
  minNumQuestions?: number;
  maxNumQuestions?: number;
  includeMCQ: boolean;
  includeFRQ: boolean;
  quizStyle: "practice" | "knowledge_test" | "mixed";
  length: "short" | "normal" | "long";
  difficulty?: "easy" | "normal" | "hard";
  customPrompt?: string;
}
