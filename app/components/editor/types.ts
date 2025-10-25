import { ReactNode } from "react";

export const noModal = {isOpen: false} as ModalContents;

export interface ModalContents {
    isOpen: boolean;
    type: "input" | "confirm" | "info" | "error" | "empty";
    width?: string;
    message?: string;
    onSubmit?: (input: string) => void;
    onProceed?: () => void;
    title?: string;
    initialValue?: string;
    placeholder?: string;
    children?: ReactNode;
}