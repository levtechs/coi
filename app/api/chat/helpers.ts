import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

import { Message, Card, NewCard, ContentNode, ContentHierarchy, ChatAttachment, GroundingChunk} from "@/lib/types"; // { content: string; isResponse: boolean }
import { Contents } from "./types";

import { 
    llmModel,
    defaultGeneralConfig, 
    limitedGeneralConfig,
} from "../gemini/config";
import {
    chatResponseSystemInstruction, 
    generateCardsSystemInstruction,
    generateHierarchySystemInstruction,
    //  === \/ below is depricated \/ 
    firstChatResponseSystemInstruction,
    genContentSystemInstruction, 
    updateContentSystemInstruction, 
} from "./prompts"
import { callGeminiApi } from "../gemini/helpers";
import { GenerateContentRequest } from "@google/generative-ai";
import { writeCardsToDb } from "../cards/helpers";
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
        const projectDocRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectDocRef);

        if (!projectSnap.exists()) {
            console.warn(`Project with ID ${projectId} does not exist.`);
            return null;
        }

        const data = projectSnap.data();

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
        const projectDocRef = doc(db, "projects", projectId);

        // Store hierarchy as an object (Firestore supports nested objects)
        await updateDoc(projectDocRef, {
            hierarchy: hierarchy
        });
    } catch (err) {
        console.error(`Error writing hierarchy for project ${projectId}:`, err);
        throw err;
    }
};

/**
 * Generates new cards using Gemini, writes them to Firestore, and returns the full list of cards.
 *
 * @param projectId - The ID of the project.
 * @param oldCards - Existing cards, if any (can be null).
 * @returns Full list of Card objects including new ones.
 */
export const generateAndWriteNewCards = async (
    projectId: string,
    oldCards: Card[] | null,
    userMessage: string,
    responseMessage: string
): Promise<Card[]> => {

    const attatchments = {oldCards, userMessage, responseMessage}
    const parts = [{ text: JSON.stringify(attatchments)}]

    const requestBody: GenerateContentRequest = {
        contents: [{
            role: "user",
            parts,
        }],
        systemInstruction: {
            role: "system",
            parts: generateCardsSystemInstruction.parts,
        },
        generationConfig: {
            responseMimeType: "application/json",
        },
    };

    // Call Gemini, fallback to streaming on 503
    let jsonString: string;
    try {
        const result = await llmModel.generateContent(requestBody);
        jsonString = result?.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
        const error = err as { status?: number };
        if (error.status === 503) {
            const streamingResp = await llmModel.generateContentStream(requestBody);
            let accumulated = "";
            for await (const chunk of streamingResp.stream) {
                const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                accumulated += partText;
            }
            jsonString = accumulated;
        } else {
            throw err;
        }
    }

    let newCardsRaw: NewCard[];
    try {
        newCardsRaw = JSON.parse(jsonString!);
    } catch (err) {
        console.error("Failed to parse new cards from Gemini:", err, jsonString);
        return oldCards || [];
    }

    // Write new cards to DB
    const newCards = await writeCardsToDb(projectId, newCardsRaw);

    // Return newCards
    return newCards;
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
 * Deduplicates cards under each category in the hierarchy by removing duplicate card IDs.
 * Keeps the first occurrence of each card ID.
 */
const deduplicateHierarchy = (hierarchy: ContentHierarchy): ContentHierarchy => {
    const seen = new Set<string>();
    const deduplicatedChildren = hierarchy.children.filter(child => {
        if (child.type === 'card') {
            if (seen.has(child.cardId)) {
                return false;
            } else {
                seen.add(child.cardId);
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
 * Generates a new content hierarchy from cards using Gemini.
 *
 * @param oldHierarchy - Existing content hierarchy, if any (can be null).
 * @param previousCards - Previously processed cards.
 * @param newCards - Newly added or changed cards.
 * @returns The new ContentHierarchy object.
 */
export const generateNewHierarchyFromCards = async (
    oldHierarchy: ContentHierarchy | null,
    previousCards: Card[],
    newCards: Card[],
): Promise<ContentHierarchy> => {
    const attachments = { oldHierarchy, previousCards, newCards };
    const parts = [{ text: JSON.stringify(attachments) }];

    const requestBody: GenerateContentRequest = {
        contents: [{ role: "user", parts }],
        systemInstruction: {
            role: "system",
            parts: generateHierarchySystemInstruction.parts,
        },
        generationConfig: {
            responseMimeType: "application/json",
        },
    };

    let jsonString: string;
    try {
        const result = await llmModel.generateContent(requestBody);
        jsonString = result?.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
        const error = err as { status?: number };
        if (error.status === 503) {
            const streamingResp = await llmModel.generateContentStream(requestBody);
            let accumulated = "";
            for await (const chunk of streamingResp.stream) {
                const partText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                accumulated += partText;
            }
            jsonString = accumulated;
        } else {
            throw err;
        }
    }

    try {
        let hierarchy: ContentHierarchy | null = null;

        const responseJSON = JSON.parse(jsonString!);

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
                console.warn("[generateNewHierarchyFromCards] No oldHierarchy to modify.");
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


export const writeChatPairToDb = async (
    message: string,
    chatAttachments: null | ChatAttachment[],
    result: string,
    projectId: string,
    uid: string,
    groundingChunks?: GroundingChunk[]
) => {
    try {
        const chatRef = doc(db, "projects", projectId, "chats", uid);

        const chatSnap = await getDoc(chatRef);

        let existingMessages: Message[] = [];
        if (chatSnap.exists()) {
            existingMessages = chatSnap.data().messages || [];
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
                ...(groundingChunks && groundingChunks.length > 0 ? { attachments: groundingChunks } : {})
            }
        ];

        if (chatSnap.exists()) {
            await updateDoc(chatRef, { messages: newMessages });
        } else {
            await setDoc(chatRef, { messages: newMessages });
        }
    } catch (err) {
        console.error("Error writing chat to DB:", err);
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
 * Writes a new content entry to the project's content collection.
 * @param newContent The content string to store.
 * @param projectId The ID of the project where this content belongs.
 */
export const writeNewContentToDb = async (
    newContent: JSON,
    projectId: string
) => {
    if (!newContent || !projectId) throw new Error("Missing content or projectId");

    try {
        const contentHistoryColRef = collection(db, "projects", projectId, "content");
        await addDoc(contentHistoryColRef, {
            content: newContent,
            createdAt: serverTimestamp()
        });

        const mainContentDocRef = doc(db, "projects", projectId);
        await setDoc(mainContentDocRef, {
             content: newContent,
             updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (err) {
        console.error("Error writing new content to DB:", err);
        throw err;
    }
};

export const getPreviousContent = async (projectId: string): Promise<string | null> => {
    try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.content || null;
        } else {
            return null;
        }
    } catch (err) {
        console.error("Error getting previous content:", err);
        throw err;
    }
};

/**
 * Calls the Gemini API to get a structured JSON response.
 * @param message The user's current message.
 * @param messageHistory The history of the conversation.
 * @returns A promise that resolves to an object with a response message and a boolean indicating new information.
 */
export const getChatResponse = async (message: string, messageHistory: Message[], prevContent: string | null) => {
    if (!message || message.trim() === "") {
        throw new Error("Message is required.");
    }

    const contents = (messageHistory || [])
        .filter((msg) => msg.content && msg.content.trim() !== "")
        .map((msg) => ({
            role: msg.isResponse ? "model" : "user",
            parts: [{ text: msg.content }]
        }));

    contents.push({
        role: "user",
        parts: [{ text: message }]
    });

    if (prevContent) {
        contents.push({
            role: "user",
            parts: [{text: `EXISTING NOTES: ${JSON.stringify(prevContent)}`}]
        })
    }

    // Define the schema for the expected JSON response.
    const generationConfig = {
        ...limitedGeneralConfig,
        responseMimeType: "application/json",
        responseSchema: {
            type: "OBJECT",
            properties: {
                "responseMessage": { "type": "STRING" },
                "hasNewInfo": { "type": "BOOLEAN" }
            },
            propertyOrdering: ["responseMessage", "hasNewInfo"]
        },
    };
    const body = {
        contents,
        systemInstruction: (prevContent ? chatResponseSystemInstruction : firstChatResponseSystemInstruction),
        generationConfig: generationConfig,
    };

    try {
        const response = await callGeminiApi(body);
        const jsonString = JSON.parse(response?.candidates?.[0]?.content?.parts?.[0]?.text);

        if (!jsonString) {
            console.error("No JSON content found in API response.");
            return null;
        }

        const parsedResponse = jsonString;

        // Return the structured object directly.
        return {
            responseMessage: parsedResponse.responseMessage,
            hasNewInfo: parsedResponse.hasNewInfo,
        };
    } catch (err) {
        console.error("Error calling Gemini API or parsing response:", err);
        return null;
    }
};

export const getUpdatedContent = async (previousContent: string | null, message: string, response: string): Promise<JSON> => {
    let body: object = {}
    if (previousContent) {
        // We add the previous content to the history to give the model full context.
        const contents: Contents = [
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: [{ text: response }] }
        ];

        body = {
            contents,
            systemInstruction: updateContentSystemInstruction(JSON.stringify(previousContent)),
            generationConfig: {
                ...defaultGeneralConfig,
                responseMimeType: "application/json",
            },
        };
    }
    else {
        const contents: Contents = [
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: [{ text: response }] }
        ];

        body = {
            contents,
            systemInstruction: genContentSystemInstruction,
            generationConfig: {
                ...defaultGeneralConfig,
                responseMimeType: "application/json",
            },
        };
    }

    const apiResponse = await callGeminiApi(body);
    if (!apiResponse) {
        throw new Error("No response from Gemini API");
    }
    try {
        const jsonResponseText = JSON.parse(apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text);
        return jsonResponseText;
    }
    catch {
        console.error("Failed to parse Gemini output as JSON:", apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text);
        throw new Error("Invalid JSON returned from Gemini");
    }
};
