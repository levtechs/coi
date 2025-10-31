"use client";

import Modal from "../modal";
import { User } from "@/lib/types";

interface UserDetailsModalProps {
    selectedUser: User | null;
    onClose: () => void;
}

export default function UserDetailsModal({ selectedUser, onClose }: UserDetailsModalProps) {
    if (!selectedUser) return null;

    return (
        <Modal
            isOpen={true}
            type="info"
            title={`User Details: ${selectedUser.displayName}`}
            onClose={onClose}
            width="4xl"
        >
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold">Basic Information</h3>
                    <p><strong>ID:</strong> {selectedUser.id}</p>
                    <p><strong>Email:</strong> {selectedUser.displayName}</p>
                    <p><strong>Display Name:</strong> {selectedUser.displayName}</p>
                    <p><strong>Actions:</strong> {selectedUser.actions ?? "N/A"}</p>
                    <p><strong>Daily Actions:</strong> {selectedUser.dailyActions ?? "N/A"}</p>
                    <p><strong>Weekly Actions:</strong> {selectedUser.weeklyActions ?? "N/A"}</p>
                    <p><strong>Star User:</strong> {selectedUser.starUser ? "Yes" : "No"}</p>
                </div>
                {selectedUser.signUpResponses && (
                    <div>
                        <h3 className="font-semibold">Questionnaire Responses</h3>
                        <p><strong>Role:</strong> {selectedUser.signUpResponses.role || 'Not specified'}</p>
                        <p><strong>How did you hear:</strong> {selectedUser.signUpResponses.howDidYouHear.join(', ')}</p>
                        <p><strong>Interests:</strong> {selectedUser.signUpResponses.interests.join(', ')}</p>
                    </div>
                )}
                {selectedUser.chatPreferences && (
                    <div>
                        <h3 className="font-semibold">Chat Preferences</h3>
                        <p><strong>Model:</strong> {selectedUser.chatPreferences.model}</p>
                        <p><strong>Thinking:</strong> {selectedUser.chatPreferences.thinking}</p>
                        <p><strong>Google Search:</strong> {selectedUser.chatPreferences.googleSearch}</p>
                        <p><strong>Force Card Creation:</strong> {selectedUser.chatPreferences.forceCardCreation}</p>
                        <p><strong>Personality:</strong> {selectedUser.chatPreferences.personality}</p>
                        <p><strong>Follow Up Questions:</strong> {selectedUser.chatPreferences.followUpQuestions}</p>
                        <p><strong>Generation Model:</strong> {selectedUser.chatPreferences.generationModel}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}