import { Timestamp } from "firebase/firestore";

export type Project = {
    id: string;
    title: string;
    ownerId: string;
    collaborators: string[]; // emails
    sharedWith: string[]; // ids
    content: JSON; // JSON
    cards: Card[]; //List of ids of the cards
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

export interface Card {
    id: string;
    title: string;
    details: string[];
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctOptionIndex: number;
}

export interface Quiz {
    createdAt?: string | Timestamp; // Optional createdAt timestamp
    description: string;       // Quiz description
    questions: QuizQuestion[]; // List of questions
    title: string;             // Quiz title
}