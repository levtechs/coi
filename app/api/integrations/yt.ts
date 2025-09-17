import { youtube } from "@googleapis/youtube";
import { YOUTUBE_API_KEY, YOUTUBE_MAX_RESULTS } from "./config";

import { YtVidDetails} from "@/lib/types";

/**
 * Search YouTube videos using a list of pre-constructed queries.
 * Executes one search per query and aggregates the results.
 *
 * @param queries - array of YouTube search queries
 * @returns Promise resolving to array of YtVidDetails
 */
export async function searchYouTubeVideos(queries: string[]): Promise<YtVidDetails[]> {
    if (!queries || queries.length === 0) {
        throw new Error("No queries provided");
    }

    // Create YouTube client
    const youtubeClient = youtube({
        version: "v3",
        auth: YOUTUBE_API_KEY
    });

    const allResults: YtVidDetails[] = [];

    for (const query of queries) {
        const trimmed = query.trim();
        if (!trimmed) continue;

        const response = await youtubeClient.search.list({
            q: trimmed,
            part: ["snippet"],
            type: ["video"],
            maxResults: YOUTUBE_MAX_RESULTS
        });

        const items = response.data.items || [];

        const videos: YtVidDetails[] = items
            .map(item => {
                const videoId = item.id?.videoId;
                const snippet = item.snippet;
                if (!videoId || !snippet) return null;

                const thumbUrl =
                    snippet.thumbnails?.high?.url ||
                    snippet.thumbnails?.medium?.url ||
                    snippet.thumbnails?.default?.url ||
                    "";

                return {
                    id: videoId,
                    title: snippet.title,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    thumbnailSrc: thumbUrl
                };
            })
            .filter((v): v is YtVidDetails => v !== null);

        allResults.push(...videos);
    }

    return allResults;
}
