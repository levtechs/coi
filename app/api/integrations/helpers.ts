import { Query, YtVidDetails } from "@/lib/types";
import { searchYouTubeVideos } from "./yt";
import { maxSemanticSimilarity } from "../gemini/helpers";
/**
 * Generate integrations (currently only YouTube videos) for a given project.
 * Fetches results for all queries and returns filtered/aggregated results.
 * 
 * @param projectId - ID of the project (for future expansion if needed)
 * @param queries - Array of Query objects
 * @returns Promise resolving to an array of YtVidDetails
 */
export const genIntegrations = async (projectId: string, queries: Query[]): Promise<YtVidDetails[]> => {
    // Only handle YouTube queries for now
    const ytQueries = queries
        .filter(q => q.source === "youtube")
        .map(q => q.query)
        .filter(q => q.trim().length > 0);

    if (ytQueries.length === 0) return [];

    // Fetch YouTube videos for all queries
    const videos = await searchYouTubeVideos(ytQueries);

    // Filter/clean videos
    const filtered = videos.map(filterIntegrations).filter((v): v is YtVidDetails => v !== null);

    // Deduplicate by video ID
    const uniqueMap = new Map<string, YtVidDetails>();
    for (const v of filtered) {
        uniqueMap.set(v.id, v);
    }

    return Array.from(uniqueMap.values());
};


export const filterIntegrations = async (
    integration: YtVidDetails,
    referenceTexts: string[],
    threshold = 0.75
): Promise<YtVidDetails | null> => {
    if (!integration.title || !integration.url) return null;

    const sim = await maxSemanticSimilarity(integration.title, referenceTexts);

    if (sim < threshold) return null;

    return integration;
};