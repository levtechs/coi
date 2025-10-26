import { Timestamp } from "firebase/firestore";

// General 

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
}

// Chat

export interface Message {
    id?: string
    content: string; //markdown
    attachments?: null | ChatAttachment[];
    isResponse: boolean;
}

export type ChatAttachment = Card | ContentNode | ContentHierarchy | GroundingChunk;
export type StreamPhase = "starting" | "streaming" | "processing" | "generating content" | "generating cards";

export interface GroundingChunk {
    web: {
        uri: string;
        title: string;
    };
}

// Cards 

export interface Card {
    id: string;
    title: string;
    url?: string;
    details?: string[];
    refImageUrls?: string[];
    iconUrl?: string;
    exclude?: boolean;
    isUnlocked?: boolean;
}

export type NewCard = Omit<Card, "id">;

export type CardFilter = "00" | "01" | "10" | "11";

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
