import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Card } from "@/lib/types";
/**
 * Recursively searches a nested object for "card" objects, which are
 * defined as having a 'title' and a 'details' array where every element is a string.
 * @param obj The object to search.
 * @param foundCards An array to accumulate the found cards.
 */
const recursivelyFindCards = (obj: unknown, foundCards: Omit<Card, 'id'>[]) => {
    if (typeof obj !== 'object' || obj === null) {
        return;
    }

    const typedObj = obj as { [key: string]: unknown };

    // Check if the current object is a valid card with string details
    if (
        typeof typedObj.title === 'string' &&
        Array.isArray(typedObj.details) &&
        typedObj.details.every(item => typeof item === 'string')
    ) {
        foundCards.push({
            title: typedObj.title,
            details: typedObj.details as string[]
        });
        return;
    }

    // Recursively search for cards in nested objects and arrays
    for (const key in typedObj) {
        if (typeof typedObj[key] === 'object' && typedObj[key] !== null) {
            recursivelyFindCards(typedObj[key], foundCards);
        }
    }
};

/**
 * Extracts card objects from a nested JSON string, writes them to Firestore,
 * and returns the list of cards with their new document IDs.
 * @param projectId The ID of the project to write the cards to.
 * @param content The JSON string containing the nested card data.
 * @returns An array of Card objects with their assigned IDs, or null on error.
 */
export const extractWriteCards = async (projectId: string, content: string): Promise<Card[] | null> => {
    try {
        // Step 1: Parse the JSON content string
        const parsedContent = JSON.parse(JSON.stringify(content));
        const extractedCards: Omit<Card, 'id'>[] = [];

        // Step 2: Recursively find and extract all cards
        recursivelyFindCards(parsedContent, extractedCards);

        if (extractedCards.length === 0) {
            console.warn("No cards found in the provided content.");
            return [];
        }

        // Step 3: Write each extracted card to the 'cards' subcollection
        const cardsCollectionRef = collection(db, "projects", projectId, "cards");
        const writePromises = extractedCards.map(async (card) => {
            const docRef = await addDoc(cardsCollectionRef, card);
            return { id: docRef.id, ...card };
        });

        // Use Promise.all to write concurrently and get all new document IDs
        const newCards = await Promise.all(writePromises);

        console.log(`Successfully wrote ${newCards.length} cards to Firestore.`);
        return newCards as Card[];

    } catch (err) {
        console.error("Error extracting and writing cards:", err);
        return null;
    }
};
