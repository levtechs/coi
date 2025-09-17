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
    isResponse: boolean;
}

export interface User {
    id: string
    email: string;
    displayName: string;
}

export interface PostCardPayload {
    title: string;
    details?: string[];
    exclude?: boolean;
}

export interface Card {
    id: string;
    title: string;
    details?: string[] | EmbedContent;
    exclude?: boolean;
}

export interface EmbedContent {
    thumbnail?: string;
    url?: string;
}

export interface ContentHierarchy {
    title: string;
    children: ContentNode[];
}

export type StreamPhase = "starting" | "streaming" | "processing" | "generating content" | "generating cards";

export type ContentNode =
    | { type: "text"; text: string }
    | { type: "card"; cardId: string }
    | { type: "subcontent"; content: ContentHierarchy };

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

export interface Query {
    source: "youtube";
    query: string;
}

export interface YtVidDetails {
    id: string;
    title: string;
    url: string;
    thumbnailSrc: string;
}