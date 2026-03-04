import type { Metadata } from "next";
import { adminDb } from "@/lib/firebaseAdmin";
import InviteContentWrapper from "./invite_content";

interface InvitePageProps {
    searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ searchParams }: InvitePageProps): Promise<Metadata> {
    const params = await searchParams;
    const token = params.token;

    if (!token) {
        return {
            title: "Enter Invitation Token - coi",
            description: "Enter an invitation token to join a project, course, or accept a friend request on coi.",
        };
    }

    try {
        const invitationsSnap = await adminDb
            .collection("invitations")
            .where("token", "==", token)
            .limit(1)
            .get();

        if (invitationsSnap.empty) {
            return {
                title: "Invitation - coi",
                description: "This invitation link may be invalid or expired.",
            };
        }

        const invitationData = invitationsSnap.docs[0].data();
        const createdBy = invitationData.createdBy;

        // Get creator's name
        let createdByName = "Someone";
        if (createdBy) {
            const userSnap = await adminDb.collection("users").doc(createdBy).get();
            if (userSnap.exists) {
                createdByName = userSnap.data()?.displayName || "Someone";
            }
        }

        // Friend request
        if (invitationData.friendRequest === true) {
            return {
                title: `${createdByName} wants to be your friend - coi`,
                description: `Accept ${createdByName}'s friend request on coi.`,
                openGraph: {
                    title: `${createdByName} wants to be your friend`,
                    description: `Accept ${createdByName}'s friend request on coi - Group learning with AI.`,
                    url: `https://coilearn.com/i?token=${token}`,
                    siteName: "coi",
                },
            };
        }

        // Project invitation
        if (invitationData.projectId) {
            const projectSnap = await adminDb.collection("projects").doc(invitationData.projectId).get();
            const projectTitle = projectSnap.exists ? projectSnap.data()?.title : "a project";
            return {
                title: `Join "${projectTitle}" - coi`,
                description: `${createdByName} invited you to join the project "${projectTitle}" on coi.`,
                openGraph: {
                    title: `Join "${projectTitle}"`,
                    description: `${createdByName} invited you to collaborate on "${projectTitle}" - coi.`,
                    url: `https://coilearn.com/i?token=${token}`,
                    siteName: "coi",
                },
            };
        }

        // Course invitation
        if (invitationData.courseId) {
            const courseSnap = await adminDb.collection("courses").doc(invitationData.courseId).get();
            const courseTitle = courseSnap.exists ? courseSnap.data()?.title : "a course";
            return {
                title: `Join "${courseTitle}" - coi`,
                description: `${createdByName} invited you to join the course "${courseTitle}" on coi.`,
                openGraph: {
                    title: `Join "${courseTitle}"`,
                    description: `${createdByName} invited you to the course "${courseTitle}" - coi.`,
                    url: `https://coilearn.com/i?token=${token}`,
                    siteName: "coi",
                },
            };
        }

        return {
            title: "Invitation - coi",
            description: "You've been invited to join something on coi.",
        };
    } catch (error) {
        console.error("Error generating invite metadata:", error);
        return {
            title: "Invitation - coi",
            description: "You've been invited to join something on coi.",
        };
    }
}

export default function InvitePage() {
    return <InviteContentWrapper />;
}
