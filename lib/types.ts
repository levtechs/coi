import { Timestamp } from "firebase/firestore";

export type Project = {
    id: string;
    title: string;
    ownerId: string;
    collaborators: string[]; // emails
    sharedWith: string[]; // ids
    cards: Card[]; 
    hierarchy: ContentHierarchy;
    quizIds?: string[]; // ids of quizzes 
};

export interface Message {
    id?: string
    content: string; //markdown
    attachments?: null | ChatAttachment[];
    isResponse: boolean;
}

export interface User {
    id: string
    email: string;
    displayName: string;
    actions?: number;
    dailyActions?: number;
    weeklyActions?: number;
    projectIds?: string[];
}

export interface PostCardPayload {
    title: string;
    details?: string[];
    exclude?: boolean;
}

export interface Card {
    id: string;
    title: string;
    url?: string;
    details?: string[];
    refImageUrls?: string[];
    iconUrl?: string;
    exclude?: boolean;
}

export interface ContentHierarchy {
    title: string;
    children: ContentNode[];
}

export type ContentNode =
    | { type: "text"; text: string }
    | { type: "card"; cardId: string }
    | { type: "subcontent"; content: ContentHierarchy };

export type ChatAttachment = Card | ContentNode | ContentHierarchy | GroundingChunk;

export interface QuizQuestion {
    question: string;
    options: string[];
    correctOptionIndex: number;
}

export interface Quiz {
    id?: string;
    createdAt?: string | Timestamp; // Optional createdAt timestamp
    description: string;       // Quiz description
    questions: QuizQuestion[]; // List of questions
    title: string;             // Quiz title
}

export type StreamPhase = "starting" | "streaming" | "processing" | "generating content" | "generating cards";

export interface GroundingChunk {
    web: {
        uri: string;
        title: string;
    };
}

export type CardFilter = "00" | "01" | "10" | "11";
