import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";

import { Card, NewCard, Label } from "@/lib/types";

import { fetchCardsFromProject } from "../helpers";
import { getVerifiedUid } from "@/app/api/helpers";

// Helper function to migrate exclude boolean to label system
const migrateCardLabels = (card: Card): Card => {
    const migratedCard = { ...card } as Card;
    
    // If card has exclude=true and no labels, add "exclude from hierarchy" label
    if (card.exclude === true && (!card.labels || card.labels.length === 0)) {
        migratedCard.labels = ["exclude from hierarchy"];
    }
    
    // If card has exclude=false and no labels, ensure empty labels array
    if (card.exclude === false && (!card.labels || card.labels.length === 0)) {
        migratedCard.labels = [];
    }
    
    return migratedCard;
};

export async function GET(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    try {
        const cards = await fetchCardsFromProject(projectId);
        // Apply migration to ensure backward compatibility
        const migratedCards = cards.map(card => migrateCardLabels(card));
        return NextResponse.json(migratedCards);

    } catch (err) {
        console.error("Error fetching cards:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST (req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    try {
        const body: Partial<NewCard> = await req.json();

        const allowedFields = ['title', 'details', 'exclude', 'labels', 'url', 'refImageUrls', 'iconUrl'];
        const providedFields = Object.keys(body);
        const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

        if (invalidFields.length > 0) {
            console.error(`[SECURITY] Attempt to set protected card fields during creation. User: ${uid}, Project: ${projectId}, Invalid fields:`, invalidFields);
            return NextResponse.json({ error: `Invalid fields: ${invalidFields.join(', ')}` }, { status: 400 });
        }

        if (!body.title || body.title.trim() === "") {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // Reference to the project's cards subcollection
        const cardsCollectionRef = collection(db, "projects", projectId, "cards");

        // Add the new card to Firestore
        const docRef = await addDoc(cardsCollectionRef, {
            title: body.title,
            details: body.details || [],
            exclude: body.exclude ?? true, // default to true if not provided
            labels: body.labels || [],
            createdAt: new Date().toISOString(),
        });

        // Construct the Card object with Firestore ID
        const newCard: Card = {
            id: docRef.id,
            title: body.title,
            details: body.details || [],
            exclude: body.exclude ?? true,
            labels: body.labels || [],
            url: body.url,
            refImageUrls: body.refImageUrls,
            iconUrl: body.iconUrl,
        };

        return NextResponse.json(newCard);
    } catch (err) {
        console.error("Error creating card:", err);
        return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    try {
        const body = await req.json();
        const { cardId, title, details, exclude, labels, url, refImageUrls, iconUrl } = body;

        if (!cardId) {
            return NextResponse.json({ error: "Card ID is required" }, { status: 400 });
        }

        const allowedFields = ['cardId', 'title', 'details', 'exclude', 'labels', 'url', 'refImageUrls', 'iconUrl'];
        const providedFields = Object.keys(body);
        const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

        if (invalidFields.length > 0) {
            console.error(`[SECURITY] Attempt to modify protected card fields. User: ${uid}, Project: ${projectId}, Invalid fields:`, invalidFields);
            return NextResponse.json({ error: `Invalid fields: ${invalidFields.join(', ')}` }, { status: 400 });
        }

        const cardDocRef = doc(db, "projects", projectId, "cards", cardId);

        // Get current card data first
        const cardDoc = await getDoc(cardDocRef);
        if (!cardDoc.exists()) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const currentCard = cardDoc.data() as Card;

        // Build update object with only provided fields
        const updateData: { title?: string; details?: string[]; exclude?: boolean; labels?: Label[]; url?: string; refImageUrls?: string[]; iconUrl?: string } = {};
        if (title !== undefined) {
            if (!title || title.trim() === "") {
                return NextResponse.json({ error: "Title is required" }, { status: 400 });
            }
            updateData.title = title;
        }
        if (details !== undefined) updateData.details = details || [];
        if (exclude !== undefined) updateData.exclude = exclude ?? true;
        if (labels !== undefined) updateData.labels = labels || [];
        if (url !== undefined) updateData.url = url;
        if (refImageUrls !== undefined) updateData.refImageUrls = refImageUrls;
        if (iconUrl !== undefined) updateData.iconUrl = iconUrl;

        await updateDoc(cardDocRef, updateData);

        // Construct updated card with merged data
        const updatedCard: Card = {
            id: cardId,
            title: title !== undefined ? title : currentCard.title,
            details: details !== undefined ? (details || []) : currentCard.details,
            exclude: exclude !== undefined ? (exclude ?? true) : currentCard.exclude,
            labels: labels !== undefined ? (labels || []) : currentCard.labels,
            url: url !== undefined ? url : currentCard.url,
            refImageUrls: refImageUrls !== undefined ? refImageUrls : currentCard.refImageUrls,
            iconUrl: iconUrl !== undefined ? iconUrl : currentCard.iconUrl,
        };

        return NextResponse.json(updatedCard);
    } catch (err) {
        console.error("Error updating card:", err);
        return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    try {
        const body = await req.json();
        const { cardId } = body;

        if (!cardId) {
            return NextResponse.json({ error: "Card ID is required" }, { status: 400 });
        }

        const cardDocRef = doc(db, "projects", projectId, "cards", cardId);

        await deleteDoc(cardDocRef);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error deleting card:", err);
        return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
    }
}
