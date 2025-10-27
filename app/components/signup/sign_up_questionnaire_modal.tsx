"use client";


import SignUpQuestions from "@/app/components/signup/sign_up_questions";
import { SignUpResponses } from "@/lib/types";
import { updateUserSignUpResponses } from "@/app/views/users";

interface SignUpQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function SignUpQuestionnaireModal({ isOpen, onClose, userId }: SignUpQuestionnaireModalProps) {
  const handleSubmit = (responses: SignUpResponses) => {
    // Save responses asynchronously without blocking the UI
    updateUserSignUpResponses(userId, responses).catch(err =>
      console.error("Failed to save sign-up responses:", err)
    );
    // Close modal immediately
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50">
            <div className="bg-[var(--neutral-100)] p-6 rounded-lg shadow-lg w-[600px] max-w-[90vw] flex flex-col gap-4 max-h-[90vh] overflow-y-auto relative">
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-xs text-[var(--neutral-500)] hover:text-[var(--neutral-700)] underline"
                >
                    Skip
                </button>
                <h2 className="text-[var(--foreground)] font-semibold text-xl text-center">
                    Help us understand you better
                </h2>
                <p className="text-sm text-center text-[var(--neutral-600)]">
                    These questions help us improve your experience
                </p>

                <SignUpQuestions
                    onSubmit={handleSubmit}
                    onSkip={handleSkip}
                />
            </div>
        </div>
    );
}