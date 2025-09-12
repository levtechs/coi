import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

import { Card, PostCardPayload } from "@/lib/types";

import { fetchCardsFromProject } from "../helpers";
import { getVerifiedUid } from "@/app/api/helpers";

export async function GET(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    try {
        const cards = await fetchCardsFromProject(projectId);
        return NextResponse.json(cards);

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
        // Parse request body
        const body: PostCardPayload = await req.json();

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
            createdAt: new Date().toISOString(),
        });

        // Construct the Card object with Firestore ID
        const newCard: Card = {
            id: docRef.id,
            title: body.title,
            details: body.details || [],
            exclude: body.exclude ?? true,
        };

        return NextResponse.json(newCard);
    } catch (err) {
        console.error("Error creating card:", err);
        return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
    }
}