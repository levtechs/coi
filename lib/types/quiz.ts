import { TimestampType } from "@/lib/types/timestamp";

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
