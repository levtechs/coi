import { Card, NewCard } from "@/lib/types/cards";

export type CourseCategory = "math" | "science" | "history" | "health" | "business" | "life skills" | "social studies" | "computer science" | "other";

export interface Course {
  id: string;
  title: string;
  description?: string;
  lessons: CourseLesson[];
  quizIds?: string[];
  public?: boolean;
  sharedWith?: string[];
  category?: CourseCategory;
  ownerId?: string;
}

export interface CourseLesson {
  id: string;
  courseId: string;
  index: number;
  title: string;
  description: string;
  content: string;
  cardsToUnlock: Card[];
  quizIds?: string[];
}

export type NewLesson = Omit<CourseLesson, "id" | "courseId" | "cardsToUnlock"> & { cardsToUnlock: NewCard[]; content: string };
export type NewCourse = Omit<Course, "id" | "lessons"> & { lessons: NewLesson[] };
