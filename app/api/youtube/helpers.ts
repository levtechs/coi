export interface YoutubeData {
    title: string;
    description: string;
    thumbnailUrl: string;
    channelTitle: string;
    publishedAt: string;
    duration?: string; // optional, if needed
}

export async function getYoutubeData(url: string): Promise<YoutubeData> {
    // Extract video ID from URL
    const videoIdMatch = url.match(/[?&]v=([^#\&\?]*)/);
    if (!videoIdMatch) {
        throw new Error('Invalid YouTube URL');
    }
    const videoId = videoIdMatch[1];

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YouTube API key not found');
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
    }

    const video = data.items[0].snippet;

    const contentDetails = data.items[0].contentDetails;

    return {
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnails.high?.url || video.thumbnails.default.url,
        channelTitle: video.channelTitle,
        publishedAt: video.publishedAt,
        duration: contentDetails.duration,
    };
}