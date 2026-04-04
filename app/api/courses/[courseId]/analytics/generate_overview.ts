import type { GenerateContentParameters } from "@google/genai";
import { genAI, getGenerationConfig, getLLMModel } from "@/app/api/gemini/config";
import { MyGenerateContentParameters } from "@/app/api/gemini/types";

const MODEL = getLLMModel("fast");

const SYSTEM = `You are writing a concise staff-facing analytics overview for a learning course. Output Markdown only (no outer code fence).

Rules:
- Ground every factual claim in the JSON and learner-question samples; do not invent statistics or quotes.
- If data is thin, say so briefly and still give useful qualitative guidance.
- Use short sections with ## headings, e.g.: ## Snapshot, ## Engagement, ## Quiz pain points, ## Unlock friction, ## Learner questions, ## Suggested focus.
- Reference learners anonymously (e.g. "several learners") — do not repeat raw user IDs.
- If PREVIOUS_OVERVIEW is provided, build on it: note trends or changes, avoid repeating the same wording verbatim; new data takes precedence.
- Keep the full document under ~900 words unless the data clearly needs more (max ~1200 words).`;

function fallbackMarkdown(courseTitle: string, metricsJson: string): string {
    return `## Analytics overview: ${courseTitle}

_The model could not generate a narrative summary. Below is the raw metrics payload for staff review._

\`\`\`json
${metricsJson.slice(0, 6000)}
\`\`\`
`;
}

export async function generateCourseAnalyticsOverviewMarkdown(input: {
    courseTitle: string;
    metricsJson: string;
    learnerQuestionsBlock: string;
    previousOverviewContinuity: string;
}): Promise<string> {
    const previousSection =
        input.previousOverviewContinuity.trim().length > 0
            ? `PREVIOUS_OVERVIEW (for continuity; may be outdated):\n${input.previousOverviewContinuity}\n\n`
            : "";

    const userText = `${SYSTEM}

${previousSection}COURSE_METRICS_JSON:
${input.metricsJson}

LEARNER_QUESTION_SAMPLES (from tutor chats; anonymized snippets):
${input.learnerQuestionsBlock}`;

    const params: MyGenerateContentParameters = {
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: userText }] }],
        config: {
            generationConfig: {
                ...(getGenerationConfig("fast") as object),
                responseMimeType: "text/plain",
                maxOutputTokens: 2048,
            },
        },
    };

    try {
        const result = await genAI.models.generateContent(params as unknown as GenerateContentParameters);
        const text =
            result?.candidates?.[0]?.content?.parts?.map((p) => ("text" in p && p.text ? p.text : "")).join("") || "";
        const trimmed = text.trim();
        if (trimmed.length > 200) return trimmed;
    } catch (err) {
        console.error("Course analytics overview LLM failed:", err);
    }

    return fallbackMarkdown(input.courseTitle, input.metricsJson);
}
