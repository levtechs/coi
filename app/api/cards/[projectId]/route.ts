import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, Project } from "@/lib/types";
import { getVerifiedUid } from "@/app/api/helpers";


export async function GET(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const projectData = projectSnap.data() as Project;

        // Check if the user is the owner or a collaborator
        const isOwner = projectData.ownerId === uid;
        const isCollaborator = projectData.sharedWith.includes(uid);
        
        if (!isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden: You do not have access to this project" }, { status: 403 });
        }

        // Reference the 'cards' subcollection within the project document.
        const cardsCollectionRef = collection(db, "projects", projectId, "cards");

        // Fetch all documents from the subcollection.
        const querySnapshot = await getDocs(cardsCollectionRef);

        // Map the Firestore documents to the Card interface.
        // It is critical to include the document's id in the returned object.
        const cards: Card[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Card, 'id'>,
        }));

        // Return the list of cards.
        return NextResponse.json(cards);

    } catch (err) {
        console.error("Error fetching cards:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
