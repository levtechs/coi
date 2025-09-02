export type Project = {
    id: string;
    title: string;
    ownerId: string;
    collaborators: string[]; // emails
    content: string; // JSON
};

export interface Message {
    id?: string
    content: string; //markdown
    isResponse: boolean;
}