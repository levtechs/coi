"use client";

import Modal from "../modal";
import { User } from "@/lib/types";

interface SignUpModalProps {
    selectedSignUpUser: User | null;
    onClose: () => void;
}

export default function SignUpModal({ selectedSignUpUser, onClose }: SignUpModalProps) {
    if (!selectedSignUpUser || !selectedSignUpUser.signUpResponses) return null;

    return (
        <Modal
            isOpen={true}
            type="info"
            title="Sign Up Responses"
            onClose={onClose}
        >
            <div>
                <p><strong>Role:</strong> {selectedSignUpUser.signUpResponses.role || 'Not specified'}</p>
                <p><strong>How did you hear:</strong> {selectedSignUpUser.signUpResponses.howDidYouHear.join(', ')}</p>
                <p><strong>Interests:</strong> {selectedSignUpUser.signUpResponses.interests.join(', ')}</p>
            </div>
        </Modal>
    );
}