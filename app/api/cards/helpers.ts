import {
    collection,
    getDocs,
    doc,
    addDoc,
    writeBatch,
    getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, Card } from "@/lib/types";

/**
 * Recursively searches a nested object for "card" objects, which are
 * defined as having a 'title' and a 'details' array. It extracts only
 * the string-based details.
 * @param obj The object to search.
 * @param foundCards An array to accumulate the found cards.
 */
const recursivelyFindCards = (obj: unknown, foundCards: Omit<Card, 'id'>[]) => {
    if (typeof obj !== 'object' || obj === null) {
        return;
    }

    const typedObj = obj as { [key: string]: unknown };

    // Check if the current object is a valid card (has title and a details array)
    if (typeof typedObj.title === 'string' && Array.isArray(typedObj.details)) {
        // This is a card. Extract only its string details, discarding sub-elements.
        const stringDetails = typedObj.details.filter(item => typeof item === 'string') as string[];
        foundCards.push({
            title: typedObj.title,
            details: stringDetails
        });

        // Continue searching for nested cards within the details array
        typedObj.details.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                recursivelyFindCards(item, foundCards);
            }
        });
    } else {
        // If not a card, just continue the search in its properties.
        for (const key in typedObj) {
            if (typeof typedObj[key] === 'object' && typedObj[key] !== null) {
                recursivelyFindCards(typedObj[key], foundCards);
            }
        }
    }
};

export const fetchCardsFromProject = async (projectId: string): Promise<Card[]> => {
    try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            throw new Error("Project not found");
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
        return cards;

    } catch (err) {
        console.error("Error fetching cards:", err);
        throw err;
    }
}

/**
 * Writes a list of cards (without IDs) into Firestore and returns
 * only the newly added cards (with generated IDs).
 *
 * @param projectId - The ID of the project where cards will be stored.
 * @param newCards - Array of cards without IDs to write to Firestore.
 * @returns A promise resolving to the list of newly added cards with Firestore IDs.
 */
export const writeCardsToDb = async (
    projectId: string,
    newCards: Omit<Card, "id">[]
): Promise<Card[]> => {
    try {
        const cardsCollectionRef = collection(db, "projects", projectId, "cards");

        const addedCards: Card[] = [];

        for (const card of newCards) {
            const docRef = await addDoc(cardsCollectionRef, card);
            addedCards.push({
                id: docRef.id,
                ...card,
            });
        }

        return addedCards;
    } catch (err) {
        console.error("Error writing cards to Firestore:", err);
        throw err;
    }
};

/*
 * ========================================================
 * ========================================================
 * ============ EVERYTHING BELOW IS DEPRICATED ============
 * ========================================================
 * ========================================================
 */

/**
 * Extracts card objects from a nested JSON string, compares them to existing
 * cards in Firestore, and performs a series of batched write operations
 * (add, update, delete) to synchronize the data.
 * @param projectId The ID of the project to write the cards to.
 * @param content The JSON string containing the nested card data.
 * @returns An array of Card objects with their assigned IDs, or null on error.
 */

/*
export const extractWriteCards = async (projectId: string, content: JSON): Promise<Card[] | null> => {
    const batch = writeBatch(db);

    try {
        // Step 1: Parse the JSON content and extract new cards.
        const parsedContent = content;
        const newExtractedCards: Omit<Card, 'id'>[] = [];
        recursivelyFindCards(parsedContent, newExtractedCards);

        // Step 2: Fetch all existing cards from Firestore.
        const cardsCollectionRef = collection(db, "projects", projectId, "cards");
        const existingDocs = await getDocs(cardsCollectionRef);
        
        // Use a Map for efficient lookup of existing cards.
        const existingCardMap = new Map<string, { id: string, details: string[] }>();
        existingDocs.forEach(doc => {
            const cardData = doc.data() as Omit<Card, 'id'>;
            // Create a unique key for each card based on its title and details.
            // This allows us to compare and identify cards easily.
            const cardKey = `${cardData.title}-${JSON.stringify(cardData.details)}`;
            existingCardMap.set(cardKey, { id: doc.id, details: cardData.details });
        });

        const updatedCardIds = new Set<string>();

        // Step 3: Iterate through new cards to identify additions and updates.
        for (const newCard of newExtractedCards) {
            const newCardKey = `${newCard.title}-${JSON.stringify(newCard.details)}`;
            
            if (existingCardMap.has(newCardKey)) {
                // If a card with this content already exists, do nothing, but mark it as seen.
                const existing = existingCardMap.get(newCardKey);
                if (existing) {
                    updatedCardIds.add(existing.id);
                }
            } else {
                // If the card is new, add it to the database.
                const newDocRef = doc(cardsCollectionRef);
                batch.set(newDocRef, newCard);
                updatedCardIds.add(newDocRef.id);
            }
        }

        // Step 4: Identify cards to be deleted.
        const deletedCardIds: string[] = [];
        existingDocs.forEach(doc => {
            if (!updatedCardIds.has(doc.id)) {
                deletedCardIds.push(doc.id);
            }
        });

        // Step 5: Perform the delete operations in the batch.
        deletedCardIds.forEach(id => {
            const docRef = doc(cardsCollectionRef, id);
            batch.delete(docRef);
        });

        // Step 6: Commit the batch to Firestore.
        await batch.commit();

        console.log(
            `Successfully synchronized cards. Added: ${newExtractedCards.length - updatedCardIds.size}, ` +
            `Updated: 0 (not directly supported with this keying), Deleted: ${deletedCardIds.length}`
        );
        
        // For a final list of cards, fetch again or re-construct.
        const finalCards = await getDocs(cardsCollectionRef);
        const allCards: Card[] = finalCards.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Card, 'id'>
        }));

        return allCards;

    } catch (err) {
        console.error("Error extracting and writing cards:", err);
        return null;
    }
};

*/