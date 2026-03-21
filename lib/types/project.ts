import { Card } from "@/lib/types/cards";
import { ContentHierarchy } from "@/lib/types/content";
import { CourseLesson } from "@/lib/types/course";
import { FileAttachment } from "@/lib/types/uploads";

export interface Project {
  id: string;
  title: string;
  ownerId: string;
  collaborators: string[];
  sharedWith: string[];
  cards: Card[];
  hierarchy: ContentHierarchy;
  quizIds?: string[];
  courseLesson?: CourseLesson;
  courseId?: string;
  uploads: FileAttachment[];
  public?: boolean;
}
