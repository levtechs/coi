export interface Content {
    role: string;
    parts: { text: string }[];
}

// Then the array of contents:
export type Contents = Content[];
