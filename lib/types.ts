import { Timestamp } from "firebase/firestore";

// General

export type Role = "teacher" | "highschool_student" | "university_student" | "grad_student" | "researcher" | "parent" | "professional" | "other";

export type Interest =
  | "programming_technology"
  | "data_science"
  | "artificial_intelligence"
  | "web_development"
  | "mobile_development"
  | "cybersecurity"
  | "mathematics"
  | "physics"
  | "chemistry"
  | "biology"
  | "science"
  | "history"
  | "literature"
  | "philosophy"
  | "psychology"
  | "business_finance"
  | "economics"
  | "entrepreneurship"
  | "marketing"
  | "health_wellness"
  | "fitness"
  | "meditation"
  | "cooking"
  | "creative_arts"
  | "music"
  | "photography"
  | "design_ux"
  | "language_learning"
  | "life_skills"
  | "other";

export type HowDidYouHear =
  | "word_of_mouth"
  | "google_search"
  | "instagram"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "online_forum"
  | "blog_article"
  | "other";

export interface SignUpResponses {
  role?: Role;
  howDidYouHear: HowDidYouHear[];
  interests: Interest[];
}

export type Project = {
    id: string;
    title: string;
    ownerId: string;
    collaborators: string[]; // emails
    sharedWith: string[]; // ids
    cards: Card[];
    hierarchy: ContentHierarchy;
    quizIds?: string[]; // ids of quizzes
    courseLesson?: CourseLesson; // if project is part of a courseLesson
    courseId?: string; // if project is part of a course
    uploads: FileAttachment[];
};

export interface User {
    id: string
    email: string;
    displayName: string;
    actions?: number;
    dailyActions?: number;
    weeklyActions?: number;
    projectIds?: string[];
    starUser?: boolean;
    chatPreferences?: ChatPreferences;
    signUpResponses?: SignUpResponses;
}

// Chat

export interface Message {
    id?: string
    content: string; //markdown
    attachments?: null | ChatAttachment[];
    isResponse: boolean;
    followUpQuestions?: string[];
}

export type ThinkData = {
    title: string;
    summary: string;
    time: number;
};

export interface FileAttachment {
    id?: string;
    type: 'file';
    name: string;
    url: string;
    size: number;
    mimeType: string;
}

export type ChatAttachment = Card | ContentNode | ContentHierarchy | GroundingChunk | ThinkData | FileAttachment;
export type StreamPhase = "starting" | "streaming" | "processing" | "generating content" | "generating cards";

// Chat Preferences
export interface ChatPreferences {
  model: "normal" | "fast";
  thinking: "off" | "force" | "auto";
  googleSearch: "auto" | "force" | "disable";
  forceCardCreation: "off" | "on" | "auto";
  personality: "default" | "gossip" | "little kid" | "angry mom";
  followUpQuestions: "off" | "auto";
  generationModel: "flash" | "flash-lite";
}

export interface GroundingChunk {
    web: {
        uri: string;
        title: string;
    };
}

// Cards 

export type Label = "important" | "ignore" | "exclude from quiz" | "exclude from hierarchy" | "investigate further" | "duplicate";

export interface Card {
    id: string;
    title: string;
    url?: string;
    details?: string[];
    refImageUrls?: string[];
    iconUrl?: string;
    exclude?: boolean; // Keep for backward compatibility
    isUnlocked?: boolean;
    labels?: Label[];
}

export type NewCard = Omit<Card, "id"> & {
    labels?: Label[];
};

export interface CardFilter {
    knowledge: boolean;
    resource: boolean;
    important: boolean;
}

// Helper for default "show all" state
export const DEFAULT_CARD_FILTER: CardFilter = {
    knowledge: true,
    resource: true,
    important: true
};

// Content 

export interface ContentHierarchy {
    title: string;
    children: ContentNode[];
}

export type ContentNode =
    | { type: "text"; text: string }
    | { type: "card"; cardId: string }
    | { type: "subcontent"; content: ContentHierarchy };

// Invites

export interface Invite {
    id?: string;
    token: string;
    projectId?: string;
    courseId?: string;
    createdBy: string;
    createdAt: string;
    acceptedBy: string[];
}

// Quiz 

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
    createdAt?: string | Timestamp; // Optional createdAt timestamp
    description: string;       // Quiz description
    questions: QuizQuestion[]; // List of questions
    title: string;             // Quiz title
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

// Course

export type CourseCategory = "math" | "science" | "history" | "health" | "business" | "life skills" | "social studies" | "computer science" | "other";

export interface Course {
    id: string;
    title: string;
    description?: string;
    lessons: CourseLesson[];
    quizIds?: string[];
    public?: boolean;
    sharedWith?: string[]; // ids
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

// Comments

export interface Comment {
    id: string;
    userId: string;
    content: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    parentId: string | null;
    upvotes: string[];
    downvotes: string[];
    replies: string[];
}

export interface CommentWithAuthor extends Omit<Comment, 'replies'> {
    author: {
        id: string;
        displayName: string;
        email: string;
    };
    replies: string[];
}

export interface CommentTree extends Omit<Comment, 'replies'> {
    author: {
        id: string;
        displayName: string;
        email: string;
    };
    replies: CommentTree[];
}

export type CreateCommentData = {
    content: string;
    parentId?: string;
};

export type UpdateCommentData = {
    content: string;
};
