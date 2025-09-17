import { 
    genAI,
    GEMINI_API_URL, 
    INITIAL_DELAY_MS, 
    MAX_RETRIES
} from "../gemini/config";

// Assume GEMINI_API_KEY is correctly set in your .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

// /gemini/embeddings.ts

/**
 * Compute the maximum semantic similarity between a candidate text and an array of reference texts.
 * Returns the highest cosine similarity score (range -1 to 1).
 *
 * @param candidate - The text to evaluate (e.g., video title or description)
 * @param references - Array of reference texts (e.g., chat message, keywords)
 * @param model - Optional Gemini embedding model (default: 'gemini-embedding-001')
 * @returns Promise resolving to the maximum similarity score
 */
export const maxSemanticSimilarity = async (
    candidate: string,
    references: string[],
    model: string = "gemini-embedding-001"
): Promise<number> => {
    if (!candidate || references.length === 0) return 0;

    // Generate embedding for the candidate text
    const candidateResp = await genAI.models.embedContent({
        model,
        contents: [candidate],
        taskType: "SEMANTIC_SIMILARITY",
    });
    const candidateEmb = candidateResp.embeddings[0].values;

    // Generate embeddings for the reference texts
    const referenceResp = await genAI.models.embedContent({
        model,
        contents: references,
        taskType: "SEMANTIC_SIMILARITY",
    });
    const referenceEmbs = referenceResp.embeddings.map(e => e.values);

    // Compute max cosine similarity
    const maxSim = Math.max(
        ...referenceEmbs.map(refEmb => cosineSimilarity(candidateEmb, refEmb))
    );

    return maxSim;
};


/*
 * ========================================================
 * ========================================================
 * ============ EVERYTHING BELOW IS DEPRICATED ============
 * ========================================================
 * ========================================================
 */


/**
 * A reusable helper function to call the Gemini API with retry logic.
 * @param body The request body to send to the Gemini API.
 * @returns The raw API response data.
 */
export const callGeminiApi = async (body: object) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                return await response.json();
            }

            if (response.status === 503 || response.status === 500) {
                if (i === MAX_RETRIES - 1) {
                    const errorText = await response.text();
                    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
                }
                const delay = INITIAL_DELAY_MS * Math.pow(2, i);
                console.error(`Gemini API returned ${response.status}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                const errorText = await response.text();
                throw new Error(`Gemini API error: ${response.status} ${errorText}`);
            }
        } catch (err) {
            if (i === MAX_RETRIES - 1) {
                throw err;
            }
            const delay = INITIAL_DELAY_MS * Math.pow(2, i);
            console.error(`Attempt ${i + 1} failed with network error. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error("Failed to get a response from Gemini API after all retries.");
};