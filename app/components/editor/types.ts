export const noModal = {isOpen: false} as ModalContents;

export interface ModalContents {
    isOpen: boolean;
    type: "input" | "confirm" | "info" | "error";
    message?: string;
    onSubmit?: (input: string) => void;
    onProceed?: () => void;
    title?: string;
    initialValue?: string;
    placeholder?: string;
}