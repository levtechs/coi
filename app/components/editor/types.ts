export const noModal = {isOpen: false} as ModalContents;

export interface ModalContents {
    isOpen: boolean;
    onSubmit?: (input: string) => void;
    title?: string;
    initialValue?: string;
    placeholder?: string;
}