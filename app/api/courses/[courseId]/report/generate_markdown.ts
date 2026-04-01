import { Content } from "@google/genai";
import { genAI, getGenerationConfig, getLLMModel } from "@/app/api/gemini/config";
import { MyGenerateContentParameters } from "@/app/api/gemini/types";
import { PortfolioAggregate } from "./aggregate";

const REPORT_MODEL = getLLMModel("fast");
const FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`;
const TRUSTED_REPORT_IMAGE_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  FIREBASE_STORAGE_BUCKET,
]);

const SYSTEM_INSTRUCTION = `You are writing a course portfolio summary for instructors. The document is LLM-generated synthesis (not the student's own words).

Rules:
- Write entirely in third person ("The student ..."). Never use first person.
- Organize by lesson order. Use clear Markdown headings (## Lesson title).
- Describe progression in general terms (e.g. "then", "after working through", "in the next lesson"). Do not invent precise timestamps.
- For optional lessons with little activity, keep a very short subsection. Expand when the JSON shows includeRichOptional is true.
- When you reference a screenshot or uploaded image, include a Markdown image line using EXACTLY the URL given in ASSET_MANIFEST: ![descriptive alt text](EXACT_URL "optional title")
- Never invent or shorten URLs. Only use URLs from ASSET_MANIFEST.
- Ground every claim in the JSON; do not invent assignments or scores.
- End with a short "## Summary" section.

Output: Markdown only. No code fences around the whole document.`;

function buildDeterministicMarkdown(a: PortfolioAggregate): string {
  const lines: string[] = [
    `# Portfolio report: ${a.courseTitle}`,
    "",
    "_This report was generated automatically from the student's activity in the course._",
    "",
  ];
  for (const b of a.lessonBundles) {
    lines.push(`## ${b.title}${b.optional ? " (optional)" : ""}`, "", "### Context", b.framing, "");
    if (b.includeRichOptional) {
      lines.push("### Activity", b.chatTranscript || "_No chat._", "", "### Unlocked work", b.unlockedCardsSummary || "_None._", "", "### Files", b.uploadsList || "_None._", "", "### Quizzes", b.quizzesBlock || "_None._", "");
    } else if (b.optional) {
      lines.push("_Light summary only — limited activity in this optional lesson._", "");
    }
  }
  lines.push("## Course-level quizzes", a.courseLevelQuizzesBlock, "", "## Summary", "The student completed the structured activities recorded above.");
  return lines.join("\n");
}

async function fetchImagePart(url: string, declaredMime: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const parsedUrl = new URL(url);
    const bucketReference = encodeURIComponent(FIREBASE_STORAGE_BUCKET);
    const isTrustedBucketUrl = TRUSTED_REPORT_IMAGE_HOSTS.has(parsedUrl.hostname)
      && (parsedUrl.hostname === FIREBASE_STORAGE_BUCKET || parsedUrl.pathname.includes(FIREBASE_STORAGE_BUCKET) || parsedUrl.pathname.includes(bucketReference) || parsedUrl.search.includes(bucketReference));
    if (parsedUrl.protocol !== "https:" || !isTrustedBucketUrl) {
      return null;
    }

    const res = await fetch(parsedUrl.toString());
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    let mime = declaredMime;
    if (!mime.startsWith("image/") || mime === "image/*") {
      mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    }
    if (!mime.startsWith("image/")) mime = "image/jpeg";
    return { mimeType: mime, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

export async function generatePortfolioMarkdown(aggregate: PortfolioAggregate): Promise<string> {
  const manifestText = aggregate.assetManifest
    .map((x) => `${x.id}\n  URL (verbatim): ${x.sourceUrl}\n  Title hint: ${x.suggestedTitle}\n  Lesson: ${x.lessonId}`)
    .join("\n\n");

  const jsonPayload = {
    courseTitle: aggregate.courseTitle,
    lessonBundles: aggregate.lessonBundles,
    courseLevelQuizzesBlock: aggregate.courseLevelQuizzesBlock,
  };

  const introText = `${SYSTEM_INSTRUCTION}

ASSET_MANIFEST — copy these URLs character-for-character into markdown images:
${manifestText || "(no image assets)"}

STUDENT_WORK_JSON:
${JSON.stringify(jsonPayload)}`;

  const userParts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [{ text: introText }];

  for (const asset of aggregate.assetManifest) {
    if (!asset.mimeType.startsWith("image/")) continue;
    const loaded = await fetchImagePart(asset.sourceUrl, asset.mimeType);
    if (!loaded) continue;
    userParts.push({ text: `Image for ${asset.id} (use URL ${asset.sourceUrl} from manifest in markdown).` });
    userParts.push({ inlineData: { mimeType: loaded.mimeType, data: loaded.data } });
  }

  const params: MyGenerateContentParameters = {
    model: REPORT_MODEL,
    contents: [{ role: "user", parts: userParts as Content["parts"] }],
    config: {
      generationConfig: {
        ...(getGenerationConfig("normal") as object),
        responseMimeType: "text/plain",
        maxOutputTokens: 8192,
      },
    },
  };

  try {
    const result = await genAI.models.generateContent(params as never);
    const text = result?.candidates?.[0]?.content?.parts?.map((p) => ("text" in p && p.text ? p.text : "")).join("") || "";
    if (text.trim().length > 200) return text.trim();
  } catch (err) {
    console.error("Portfolio report LLM failed:", err);
  }

  return buildDeterministicMarkdown(aggregate);
}
