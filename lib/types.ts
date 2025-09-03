export type Project = {
    id: string;
    title: string;
    ownerId: string;
    collaborators: string[]; // emails
    sharedWith: string[]; // ids
    content: string; // JSON
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