import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

import { Message, Card, NewCard, ContentNode, ContentHierarchy, ChatAttachment, GroundingChunk, TutorAction} from "@/lib/types"; // { content: string; isResponse: boolean }

import {
    genAI,
} from "../gemini/config";

import { Content, GenerationConfig, Tool } from "@google/genai";

type MyConfig = {
  generationConfig: GenerationConfig;
  tools?: Tool[];
};

type MyGenerateContentParameters = {
  model: string;
  contents: Content[];
  config: MyConfig;
};
import {
    generateCardsSystemInstruction,
    generateHierarchySystemInstruction,
} from "./prompts"
import { writeCardsToDb, updateCardInDb } from "../cards/helpers";
import { getYoutubeData } from "../youtube/helpers";

/**
 * Recursively builds a JSON representation of a content hierarchy combined with its referenced cards.
 * Used in prompt context for chat LLM
 *
 * @param cards - The full list of available cards.
 * @param hierarchy - The content hierarchy structure.
 * @returns A JSON string that combines the hierarchy and card details, suitable for providing as context to an LLM.
 */
export const getStringFromHierarchyAndCards = async (
    cards: Card[],
    hierarchy: ContentHierarchy
): Promise<string> => {
    /**
     * Recursively serialize a node or hierarchy.
     */
    const serializeHierarchy = (h: ContentHierarchy): object => {
        return {
            title: h.title,
            children: h.children.map((child) => {
                switch (child.type) {
                    case "text":
                        return { type: "text", text: child.text };

                    case "card": {
                        const card = cards.find((c) => c.id === child.cardId);

                        if (card) {
                            return {
                                type: "card",
                                id: card.id,
                                title: card.title,
                                details: card.details,
                            };
                        } else {
                            return {
                                type: "card",
                                id: child.cardId,
                                missing: true,
                            };
                        }
                    }

                    case "subcontent":
                        return {
                            type: "subcontent",
                            content: serializeHierarchy(child.content),
                        };
                }
            }),
        };
    };

    const result = serializeHierarchy(hierarchy);
    return JSON.stringify(result, null, 2);
};

/**
 * Fetches the previous content hierarchy for a project from Firestore.
 *
 * @param projectId - The ID of the project.
 * @returns The ContentHierarchy object if it exists, otherwise null.
 */
export const getPreviousHierarchy = async (
    projectId: string,
): Promise<ContentHierarchy | null> => {
    try {
        const projectDocRef = adminDb.collection("projects").doc(projectId);
        const projectSnap = await projectDocRef.get();

        if (!projectSnap.exists) {
            console.warn(`Project with ID ${projectId} does not exist.`);
            return null;
        }

        const data = projectSnap.data()!;

        if (!data.hierarchy) {
            console.warn(`Project ${projectId} has no hierarchy field.`);
            return null;
        }

        // If hierarchy is stored as a string (JSON), parse it
        let hierarchy: ContentHierarchy;
        if (typeof data.hierarchy === "string") {
            hierarchy = JSON.parse(data.hierarchy) as ContentHierarchy;
        } else {
            hierarchy = data.hierarchy as ContentHierarchy;
        }

        return hierarchy;
    } catch (err) {
        console.error("Error fetching previous content hierarchy:", err);
        return null;
    }
};

/**
 * Writes a content hierarchy to a Firestore project document.
 *
 * @param projectId - The ID of the project to update.
 * @param hierarchy - The ContentHierarchy object to store.
 */
export const writeHierarchy = async (
    projectId: string,
    hierarchy: ContentHierarchy
): Promise<void> => {
    try {
        const projectDocRef = adminDb.collection("projects").doc(projectId);

        // Store hierarchy as an object (Firestore supports nested objects)
        await projectDocRef.update({
            hierarchy: hierarchy
        });
    } catch (err) {
        console.error(`Error writing hierarchy for project ${projectId}:`, err);
        throw err;
    }
};

/**
 * Generates new cards using Gemini, writes them to Firestore, and returns the full list of cards and unlocked cards.
 *
 * @param projectId - The ID of the project.
 * @param oldCards - Existing cards, if any (can be null).
 * @param cardsToUnlock - Cards that can be unlocked, if applicable.
 * @returns Object with newCards and unlockedCards.
 */
export const generateAndWriteNewCards = async (
    projectId: string,
    oldCards: Card[] | null,
    userMessage: string,
    responseMessage: string,
    generationModel?: "flash" | "flash-lite"
): Promise<Card[]> => {

    const attachments = { oldCards, userMessage, responseMessage };
    const parts = [{ text: JSON.stringify(attachments) }]

    const systemInstruction = generateCardsSystemInstruction;

    const systemInstructionContent = { role: "user", parts: systemInstruction.parts };
    const allContents = [systemInstructionContent, { role: "user", parts }];

    const model = generationModel === "flash-lite" ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";
    const config: MyConfig = {
        generationConfig: {
            responseMimeType: "application/json",
        },
    };

    const params: MyGenerateContentParameters = {
        model,
        contents: allContents as Content[],
        config,
    };

    // Call Gemini, fallback to streaming on 503
    let jsonString: string;
    try {
        const result = await genAI.models.generateContent(params);
        jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
        const error = err as { status?: number };
        if (error.status === 503) {
            const streamingResp = await genAI.models.generateContentStream(params);
            let accumulated = "";
            for await (const chunk of streamingResp) {
                const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                accumulated += partText;
            }
            jsonString = accumulated;
        } else {
            throw err;
        }
    }

    let newCardsRaw: NewCard[] = [];

    try {
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(jsonString);
        // Expect array of cards
        newCardsRaw = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("generateAndWriteNewCards: Failed to parse response from Gemini:", err, "jsonString:", jsonString);
        return [];
    }

    // Write new cards to DB
    const newCards = await writeCardsToDb(projectId, newCardsRaw);

    return newCards;
};

/**
 * Parses unlocked card IDs from the chat response.
 * Looks for the last [UNLOCKED_CARDS] token in the response.
 */
export const parseUnlockedCardsFromResponse = (response: string): string[] => {
    // Find the last occurrence of [UNLOCKED_CARDS] in the response
    const lastIndex = response.lastIndexOf('[UNLOCKED_CARDS]');
    if (lastIndex === -1) {
        return [];
    }

    // Extract everything after [UNLOCKED_CARDS] until end of string
    const afterToken = response.substring(lastIndex + '[UNLOCKED_CARDS]'.length).trim();

    // If empty, no IDs specified
    if (!afterToken) {
        return [];
    }

    // Split by comma and clean up
    const ids = afterToken.split(',').map(id => id.trim()).filter(id => id.length > 0);
    return ids;
};

/**
 * Unlocks cards based on provided IDs, filtering against available cards and existing cards.
 */
export const unlockCards = (unlockedCardIds: string[], availableCards: Card[], existingCardIds: Set<string>): Card[] => {
    const unlockedCards = availableCards.filter(card => unlockedCardIds.includes(card.id) && !existingCardIds.has(card.id));
    return unlockedCards;
};

/**
 * Generates cards from groundingChunks
*
* @param projectId - The ID of the project.
* @param oldCards - Existing cards, if any (can be null).
* @param groundingChunks - groundingChunks with title and uri
* @returns Full list of Card objects including new ones.
*/
export const groundingChunksToCardsAndWrite = async (
    projectId: string,
    oldCards: Card[],
    groundingChunks: GroundingChunk[],
): Promise<Card[]> => {
    // Priority function
    const getPriority = (uri: string): number => {
        const domain = new URL(uri).hostname.toLowerCase();
        if (domain.includes('youtube.com')) return 10;
        if (domain.includes('wikipedia.org')) return 9;
        if (domain.endsWith('.org') || domain.endsWith('.edu') || domain.endsWith('.gov')) return 5;
        return 1;
    };

    // Sort chunks by priority desc
    const sortedChunks = groundingChunks.sort((a, b) => getPriority(b.web.uri) - getPriority(a.web.uri));

    const newCardsRaw: NewCard[] = [];

    // We will limit the number of websites scraped with this cost. 
    // Some may be cheaper to scrape or are more usefull so they will contribute to cost less
    let cost: number = 0;

    // Process other chunks
    for (const chunk of sortedChunks) {
        if (cost > 5) break;
        const uri = chunk.web.uri;

        // Check if a card with this uri already exists
        const existingCard = oldCards.find(card => card.url === uri);
        if (existingCard) {
            continue; // Skip if already exists
        }

        try {
            // Fetch the webpage to extract images with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            const response = await fetch(uri, {
                redirect: "follow",
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const html = await response.text();

            cost += 1;

            // Extract title
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const scrapedTitle = titleMatch ? titleMatch[1].trim() : chunk.web.title;

            
            if (!response.ok) {
                console.warn(`Failed to fetch ${uri}: ${response.status}`);
                // Still create card without images
                newCardsRaw.push({
                    title: `resource: "${scrapedTitle}"`,
                    url: response.url,
                    exclude: false,
                });
                continue;
            }

            // Youtube chunks handled differently
            if (response.url.includes("youtube.com") || response.url.includes("youtu.be")) {
                try {
                    const data = await getYoutubeData(response.url);
                    const desc = data.description.length > 80 ? data.description.slice(0, 77) + "..." : data.description;
                    newCardsRaw.push({
                        title: `resource: "${data.title}"`,
                        url: response.url,
                        details: [
                            desc,
                            `Channel: ${data.channelTitle}`,
                            `Duration: ${data.duration || 'N/A'}`,
                            `Published: ${new Date(data.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                        ],
                        refImageUrls: [data.thumbnailUrl],
                        exclude: false,
                    });
                } catch (err) {
                    console.error(`Error processing YouTube ${response.url}:`, err);
                    // Fallback
                    newCardsRaw.push({
                        title: `resource: "${chunk.web.title}"`,
                        url: chunk.web.uri,
                        exclude: false,
                    });
                }
                finally {
                    cost -= 1; // Youtube videos shouldn't contribute to cost 
                    continue;
                }
            }


            // Extract favicon
            let iconUrl: string | undefined;
            const iconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["'][^>]*>/i);
            if (iconMatch) {
                try {
                    iconUrl = new URL(iconMatch[1], response.url).href;
                } catch {
                    iconUrl = new URL('/favicon.ico', response.url).href;
                }
            } else {
                iconUrl = new URL('/favicon.ico', response.url).href;
            }

            // Extract first heading
            const headingMatch = html.match(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/i);
            let firstHeading = '';
            if (headingMatch) {
                // Strip HTML tags
                firstHeading = headingMatch[1].replace(/<[^>]*>/g, '').trim();
                if (firstHeading.length > 128) {
                    firstHeading = firstHeading.slice(0, 125) + '...';
                }
            }

            // Extract image URLs (limit to first 10)
            const imgMatches = html.match(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi) || [];
            const imageCandidates: string[] = [];
            for (const imgTag of imgMatches.slice(0, 10)) { // Limit to first 10
                const srcMatch = imgTag.match(/src=["']([^"']*)["']/);
                if (srcMatch) {
                    try {
                        const imgUrl = new URL(srcMatch[1], response.url).href;
                        if (!imgUrl.toLowerCase().includes('.svg') && !imgUrl.toLowerCase().includes('.ico')) {
                            imageCandidates.push(imgUrl);
                        }
                    } catch {
                        // Skip invalid URLs
                    }
                }
            }

            // Fetch image details with timeout and concurrency limit
            const imageDetails = await Promise.allSettled(
                imageCandidates.map(async (url) => {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
                        const headRes = await fetch(url, { method: 'HEAD', signal: controller.signal });
                        clearTimeout(timeoutId);
                        const contentType = headRes.headers.get('content-type') || '';
                        const contentLength = parseInt(headRes.headers.get('content-length') || '0');
                        if (contentType.startsWith('image/') && contentLength > 1000) { // Filter small or non-images
                            return { url, size: contentLength };
                        }
                    } catch {
                        // Ignore errors
                    }
                    return null;
                })
            ).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

            const validImages = imageDetails.filter(Boolean).sort((a, b) => (b?.size || 0) - (a?.size || 0));
            const refImageUrls = validImages.slice(0, 5).map(img => img!.url);

            newCardsRaw.push({
                title: `resource: "${scrapedTitle}"`,
                url: response.url,
                iconUrl,
                exclude: false,
                ...(firstHeading && { details: [firstHeading] }),
                ...(refImageUrls.length > 0 && { refImageUrls }),
            });
        } catch (err) {
            console.error(`Error processing ${uri}:`, err);
            // Create card without images on error
            newCardsRaw.push({
                title: `resource: "${chunk.web.title}"`,
                url: uri,
                exclude: false,
            });
        }
    }

    // Write new cards to DB
    const newCards = await writeCardsToDb(projectId, newCardsRaw);

    // Return newCards
    return newCards;
};

/**
 * Deduplicate hierarchy categories by removing duplicate card IDs.
 */
const deduplicateHierarchy = (hierarchy: ContentHierarchy): ContentHierarchy => {
    const seenCards = new Set<string>();
    const seenSubcontent = new Set<string>();
    const seenText = new Set<string>();
    const deduplicatedChildren = hierarchy.children.filter(child => {
        if (child.type === 'card') {
            if (seenCards.has(child.cardId)) {
                return false;
            } else {
                seenCards.add(child.cardId);
                return true;
            }
        } else if (child.type === 'subcontent') {
            if (seenSubcontent.has(child.content.title)) {
                return false;
            } else {
                seenSubcontent.add(child.content.title);
                return true;
            }
        } else if (child.type === 'text') {
            if (seenText.has(child.text)) {
                return false;
            } else {
                seenText.add(child.text);
                return true;
            }
        }
        return true;
    });

    return {
        title: hierarchy.title,
        children: deduplicatedChildren.map(child => {
            if (child.type === 'subcontent') {
                return {
                    type: 'subcontent',
                    content: deduplicateHierarchy(child.content)
                };
            }
            return child;
        })
    };
};



/**
 * Parses JSON response from Gemini for hierarchy generation.
 */
const parseHierarchyResponse = (jsonString: string, oldHierarchy: ContentHierarchy | null): ContentHierarchy => {
    try {
        let hierarchy: ContentHierarchy | null = null;

        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
        const responseJSON = JSON.parse(jsonString);

        if (responseJSON.type === "new") {
            hierarchy = deduplicateHierarchy(responseJSON.fullHierarchy);
        } else if (responseJSON.type === "modified") {
            // Start with a deep copy of oldHierarchy
            hierarchy = JSON.parse(JSON.stringify(oldHierarchy));

            const actions: {
                action: "insert" | "replace" | "delete";
                targetSection: string;
                node?: ContentNode;
                beforeCardId?: string;
            }[] = responseJSON.actions;

            const applyActions = (node: ContentHierarchy) => {
                for (const action of actions) {
                    const applyToChildren = (children: ContentNode[]): ContentNode[] => {
                        switch (action.action) {
                            case "insert":
                                if (node.title === action.targetSection && action.node) {
                                    if (action.beforeCardId) {
                                        const idx = children.findIndex(
                                            (c) => c.type === "card" && c.cardId === action.beforeCardId
                                        );
                                        if (idx >= 0) {
                                            children.splice(idx, 0, action.node);
                                        } else {
                                            children.push(action.node);
                                        }
                                    } else {
                                        children.push(action.node);
                                    }
                                }
                                break;

                            case "replace":
                                if (node.title === action.targetSection && action.node) {
                                    const idx = children.findIndex((c) => {
                                        if (c.type !== action.node?.type) return false;

                                        switch (c.type) {
                                            case "card":
                                                return (
                                                    action.node.type === "card" &&
                                                    c.cardId === action.node.cardId
                                                );
                                            case "text":
                                                return (
                                                    action.node.type === "text" &&
                                                    c.text === action.node.text
                                                );
                                            case "subcontent":
                                                return (
                                                    action.node.type === "subcontent" &&
                                                    c.content.title === action.node.content.title
                                                );
                                        }
                                    });

                                    if (idx >= 0) {
                                        children[idx] = action.node;
                                    }
                                }
                                break;

                            case "delete":
                                if (node.title === action.targetSection && action.node) {
                                    const idx = children.findIndex((c) => {
                                        if (c.type !== action.node?.type) return false;

                                        switch (c.type) {
                                            case "card":
                                                return (
                                                    action.node.type === "card" &&
                                                    c.cardId === action.node.cardId
                                                );
                                            case "text":
                                                return (
                                                    action.node.type === "text" &&
                                                    c.text === action.node.text
                                                );
                                            case "subcontent":
                                                return (
                                                    action.node.type === "subcontent" &&
                                                    c.content.title === action.node.content.title
                                                );
                                        }
                                    });

                                    if (idx >= 0) {
                                        children.splice(idx, 1);
                                    }
                                }
                                break;
                        }
                        // recurse into subcontent children
                        children.forEach((child) => {
                            if (child.type === "subcontent") {
                                applyActions(child.content);
                            }
                        });

                        return children;
                    };

                    node.children = applyToChildren(node.children);
                }
            };

            if (hierarchy) {
                applyActions(hierarchy);
                hierarchy = deduplicateHierarchy(hierarchy);
            } else {
                console.warn("[parseHierarchyResponse] No oldHierarchy to modify.");
            }
        }

        if (hierarchy) return hierarchy;
        else if (oldHierarchy) return deduplicateHierarchy(oldHierarchy);
        else throw "could not create or update new hierarchy";
    } catch (err) {
        console.error("Failed to parse hierarchy from Gemini:", err, jsonString);
        throw err;
    }
};

/**
 * Generates new content hierarchy from cards using Gemini.
 */
export const generateNewHierarchyFromCards = async (
    oldHierarchy: ContentHierarchy | null,
    previousCards: Card[],
    newCards: Card[],
    generationModel?: "flash" | "flash-lite"
): Promise<ContentHierarchy> => {
    const attachments = { oldHierarchy, previousCards, newCards };
    const parts = [{ text: JSON.stringify(attachments) }];

    const systemInstructionContent = { role: "user", parts: generateHierarchySystemInstruction.parts };
    const allContents = [systemInstructionContent, { role: "user", parts }];

    const model = generationModel === "flash-lite" ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";
    const config: MyConfig = {
        generationConfig: {
            responseMimeType: "application/json",
        },
    };

    const params: MyGenerateContentParameters = {
        model,
        contents: allContents as Content[],
        config,
    };

    let jsonString: string;
    try {
        const result = await genAI.models.generateContent(params);
        jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
        const error = err as { status?: number };
        if (error.status === 503) {
            const streamingResp = await genAI.models.generateContentStream(params);
            let accumulated = "";
            for await (const chunk of streamingResp) {
                const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                accumulated += partText;
            }
            jsonString = accumulated;
        } else {
            throw err;
        }
    }

    return parseHierarchyResponse(jsonString!, oldHierarchy);
};




export const writeChatPairToDb = async (
    message: string,
    chatAttachments: null | ChatAttachment[],
    result: string,
    projectId: string,
    uid: string,
    responseAttachments?: ChatAttachment[],
    followUpQuestions?: string[]
) => {
    try {
        const chatRef = adminDb.collection("projects").doc(projectId).collection("chats").doc(uid);

        const chatSnap = await chatRef.get();

        let existingMessages: Message[] = [];
        if (chatSnap.exists) {
            existingMessages = chatSnap.data()?.messages || [];
        }

        const newMessages: Message[] = [
            ...existingMessages,
            {
                content: message,
                isResponse: false,
                ...(chatAttachments && chatAttachments.length > 0 ? { attachments: chatAttachments } : {})
            },
            {
                content: result,
                isResponse: true,
                ...(responseAttachments && responseAttachments.length > 0 ? { attachments: responseAttachments } : {}),
                ...(followUpQuestions && followUpQuestions.length > 0 ? { followUpQuestions } : {})
            }
        ];

        if (chatSnap.exists) {
            await chatRef.update({ messages: newMessages });
        } else {
            await chatRef.set({ messages: newMessages });
        }
    } catch (err) {
        console.error("Error writing chat to DB:", err);
        throw err;
    }
};
// ==== Tutor Action Helpers ====

/**
 * Renames a section in hierarchy tree.
 */
function renameSectionInHierarchy(hierarchy: ContentHierarchy, oldTitle: string, newTitle: string): boolean {
    if (hierarchy.title === oldTitle) {
        hierarchy.title = newTitle;
        return true;
    }
    for (const child of hierarchy.children) {
        if (child.type === "subcontent" && renameSectionInHierarchy(child.content, oldTitle, newTitle)) {
            return true;
        }
    }
    return false;
}

/**
 * Creates new section in hierarchy.
 */
function createSectionInHierarchy(hierarchy: ContentHierarchy, title: string, parentSection?: string): boolean {
    const newSection: ContentNode = { type: "subcontent", content: { title, children: [] } };
    
    if (!parentSection) {
        hierarchy.children.push(newSection);
        return true;
    }

    // Find parent section and add as child
    if (hierarchy.title === parentSection) {
        hierarchy.children.push(newSection);
        return true;
    }
    for (const child of hierarchy.children) {
        if (child.type === "subcontent" && createSectionInHierarchy(child.content, title, parentSection)) {
            return true;
        }
    }
    return false;
}

/**
 * Deletes section from hierarchy.
 */
function deleteSectionFromHierarchy(hierarchy: ContentHierarchy, title: string): boolean {
    for (let i = 0; i < hierarchy.children.length; i++) {
        const child = hierarchy.children[i];
        if (child.type === "subcontent") {
            if (child.content.title === title) {
                hierarchy.children.splice(i, 1);
                return true;
            }
            if (deleteSectionFromHierarchy(child.content, title)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Removes card node from hierarchy.
 */
function removeCardFromHierarchy(hierarchy: ContentHierarchy, cardId: string): boolean {
    for (let i = 0; i < hierarchy.children.length; i++) {
        const child = hierarchy.children[i];
        if (child.type === "card" && child.cardId === cardId) {
            hierarchy.children.splice(i, 1);
            return true;
        }
        if (child.type === "subcontent" && removeCardFromHierarchy(child.content, cardId)) {
            return true;
        }
    }
    return false;
}

/**
 * Adds card to specific section in hierarchy.
 */
function addCardToSection(hierarchy: ContentHierarchy, cardId: string, sectionTitle: string): boolean {
    if (hierarchy.title === sectionTitle) {
        hierarchy.children.push({ type: "card", cardId });
        return true;
    }
    for (const child of hierarchy.children) {
        if (child.type === "subcontent" && addCardToSection(child.content, cardId, sectionTitle)) {
            return true;
        }
    }
    return false;
}

/**
 * Executes tutor actions on project.
 */
export async function executeTutorActions(
    actions: TutorAction[],
    projectId: string,
    hierarchy: ContentHierarchy,
    cards: Card[],
    generationModel?: "flash" | "flash-lite"
): Promise<{ modifiedHierarchy: ContentHierarchy | null; deletedCardIds: string[] }> {
    // Deep copy hierarchy so we can mutate it
    let currentHierarchy = JSON.parse(JSON.stringify(hierarchy)) as ContentHierarchy;
    let hierarchyModified = false;
    let needsRegeneration = false;
    const deletedCardIds: string[] = [];

    // Sort actions: do direct mutations first, regenerate_hierarchy last
    const sortedActions = [...actions].sort((a, b) => {
        if (a.type === "regenerate_hierarchy") return 1;
        if (b.type === "regenerate_hierarchy") return -1;
        return 0;
    });

    for (const action of sortedActions) {
        try {
            switch (action.type) {
                case "delete_card": {
                    // Delete card from Firestore
                    const cardRef = adminDb.collection("projects").doc(projectId).collection("cards").doc(action.cardId);
                    await cardRef.delete();
                    deletedCardIds.push(action.cardId);
                    // Also remove from hierarchy
                    removeCardFromHierarchy(currentHierarchy, action.cardId);
                    hierarchyModified = true;
                    break;
                }
                case "rename_section": {
                    const renamed = renameSectionInHierarchy(currentHierarchy, action.oldTitle, action.newTitle);
                    if (renamed) hierarchyModified = true;
                    else console.error(`Tutor action: section "${action.oldTitle}" not found for rename`);
                    break;
                }
                case "create_section": {
                    const created = createSectionInHierarchy(currentHierarchy, action.title, action.parentSection);
                    if (created) hierarchyModified = true;
                    else console.error(`Tutor action: parent section "${action.parentSection}" not found for create`);
                    break;
                }
                case "delete_section": {
                    const deleted = deleteSectionFromHierarchy(currentHierarchy, action.title);
                    if (deleted) hierarchyModified = true;
                    else console.error(`Tutor action: section "${action.title}" not found for delete`);
                    break;
                }
                case "move_card": {
                    const removed = removeCardFromHierarchy(currentHierarchy, action.cardId);
                    if (removed) {
                        const added = addCardToSection(currentHierarchy, action.cardId, action.toSection);
                        if (!added) {
                            console.error(`Tutor action: target section "${action.toSection}" not found for move_card`);
                        }
                        hierarchyModified = true;
                    } else {
                        console.error(`Tutor action: card "${action.cardId}" not found for move`);
                    }
                    break;
                }
                case "regenerate_hierarchy": {
                    needsRegeneration = true;
                    break;
                }
            }
        } catch (err) {
            console.error(`Tutor action "${action.type}" failed:`, err);
        }
    }

    // If regeneration is requested, call hierarchy generation AI
    if (needsRegeneration) {
        try {
            // Filter out deleted cards
            const remainingCards = cards.filter(c => !deletedCardIds.includes(c.id));
            // Pass empty newCards array and all remaining cards as previousCards - the AI will reorganize
            currentHierarchy = await generateNewHierarchyFromCards(currentHierarchy, remainingCards, [], generationModel);
            hierarchyModified = true;
        } catch (err) {
            console.error("Tutor action: hierarchy regeneration failed:", err);
        }
    }

    return {
        modifiedHierarchy: hierarchyModified ? currentHierarchy : null,
        deletedCardIds,
    };
}

/*
 * ========================================================
 * ========================================================
 * ============ EVERYTHING BELOW IS DEPRICATED ============
 * ========================================================
 * ========================================================
 */


/**
 * Writes new content entry to project's content collection.
 */
export const writeNewContentToDb = async (
    newContent: JSON,
    projectId: string
) => {
    if (!newContent || !projectId) throw new Error("Missing content or projectId");

    try {
        const contentHistoryColRef = adminDb.collection("projects").doc(projectId).collection("content");
        await contentHistoryColRef.add({
            content: newContent,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const mainContentDocRef = adminDb.collection("projects").doc(projectId);
        await mainContentDocRef.set({
             content: newContent,
             updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (err) {
        console.error("Error writing new content to DB:", err);
        throw err;
    }
};

export const enrichResourceCards = async (
    projectId: string,
    cards: Card[],
    existingCards: Card[]
): Promise<void> => {
    const RESOURCE_SCRAPE_BUDGET = 5;
    const RESOURCE_FETCH_TIMEOUT_MS = 10000;
    const IMAGE_HEAD_TIMEOUT_MS = 5000;
    const MAX_YOUTUBE_DESCRIPTION_LENGTH = 80;
    const MAX_HEADING_LENGTH = 128;
    const MAX_IMAGE_CANDIDATES = 10;
    const MIN_IMAGE_BYTES = 1000;

    const resourceCards = cards.filter((card) => card.url && !card.iconUrl && !card.refImageUrls?.length);
    if (resourceCards.length === 0) return;

    let cost = 0;

    for (const card of resourceCards) {
        if (cost > RESOURCE_SCRAPE_BUDGET || !card.url) break;

        const alreadyEnriched = existingCards.find((c) => c.url === card.url && (c.iconUrl || (c.refImageUrls && c.refImageUrls.length > 0)));
        if (alreadyEnriched) continue;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), RESOURCE_FETCH_TIMEOUT_MS);
            const response = await fetch(card.url, {
                redirect: "follow",
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) continue;

            const updates: Partial<Omit<Card, "id">> = {};

            if (response.url.includes("youtube.com") || response.url.includes("youtu.be")) {
                try {
                    const data = await getYoutubeData(response.url);
                    const desc = data.description.length > MAX_YOUTUBE_DESCRIPTION_LENGTH
                        ? data.description.slice(0, MAX_YOUTUBE_DESCRIPTION_LENGTH - 3) + "..."
                        : data.description;
                    updates.details = [
                        desc,
                        `Channel: ${data.channelTitle}`,
                        `Duration: ${data.duration || 'N/A'}`,
                        `Published: ${new Date(data.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                    ];
                    updates.refImageUrls = [data.thumbnailUrl];
                } catch (err) {
                    console.error(`enrichResourceCards youtube error for ${card.url}:`, err);
                }
            } else {
                const html = await response.text();
                cost += 1;

                const iconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["'][^>]*>/i);
                if (iconMatch) {
                    try {
                        updates.iconUrl = new URL(iconMatch[1], response.url).href;
                    } catch {
                        updates.iconUrl = new URL('/favicon.ico', response.url).href;
                    }
                } else {
                    updates.iconUrl = new URL('/favicon.ico', response.url).href;
                }

                if (!card.details || card.details.length === 0) {
                    const headingMatch = html.match(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/i);
                    if (headingMatch) {
                        let heading = headingMatch[1].replace(/<[^>]*>/g, '').trim();
                        if (heading.length > MAX_HEADING_LENGTH) heading = heading.slice(0, MAX_HEADING_LENGTH - 3) + '...';
                        if (heading) updates.details = [heading];
                    }
                }

                const imgMatches = html.match(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi) || [];
                const imageCandidates: string[] = [];
                for (const imgTag of imgMatches.slice(0, MAX_IMAGE_CANDIDATES)) {
                    const srcMatch = imgTag.match(/src=["']([^"']*)["']/);
                    if (srcMatch) {
                        try {
                            const imgUrl = new URL(srcMatch[1], response.url).href;
                            if (!imgUrl.toLowerCase().includes('.svg') && !imgUrl.toLowerCase().includes('.ico')) {
                                imageCandidates.push(imgUrl);
                            }
                        } catch {
                            // ignore invalid image URLs
                        }
                    }
                }

                const imageDetails = await Promise.allSettled(
                    imageCandidates.map(async (url) => {
                        try {
                            const imageController = new AbortController();
                            const imageTimeout = setTimeout(() => imageController.abort(), IMAGE_HEAD_TIMEOUT_MS);
                            const headRes = await fetch(url, { method: 'HEAD', signal: imageController.signal });
                            clearTimeout(imageTimeout);
                            const contentType = headRes.headers.get('content-type') || '';
                            const contentLength = parseInt(headRes.headers.get('content-length') || '0');
                            if (contentType.startsWith('image/') && contentLength > MIN_IMAGE_BYTES) {
                                return { url, size: contentLength };
                            }
                        } catch {
                            // ignore image head failures
                        }
                        return null;
                    })
                ).then((results) => results.map((r) => r.status === 'fulfilled' ? r.value : null));

                const validImages = imageDetails.filter(Boolean).sort((a, b) => (b?.size || 0) - (a?.size || 0));
                const refImageUrls = validImages.slice(0, 5).map((img) => img!.url);
                if (refImageUrls.length > 0) updates.refImageUrls = refImageUrls;
            }

            if (Object.keys(updates).length > 0) {
                await updateCardInDb(projectId, card.id, updates);
            }
        } catch (err) {
            console.error(`enrichResourceCards error for ${card.id}:`, err);
        }
    }
};

export const getPreviousContent = async (projectId: string): Promise<string | null> => {
    try {
        const docRef = adminDb.collection("projects").doc(projectId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data()!;
            return data.content || null;
        } else {
            return null;
        }
    } catch (err) {
        console.error("Error getting previous content:", err);
        throw err;
    }
};
