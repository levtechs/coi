import { adminDb } from "@/lib/firebaseAdmin";
import { fetchCardsFromProject } from "@/app/api/cards/helpers";
import { fetchUploadsFromProject } from "@/app/api/uploads/helpers";
import { fetchQuiz, fetchQuizAttemptsForUser } from "@/app/api/quiz/[quizId]/helpers";
import { Course, CourseStudentLessonProgress } from "@/lib/types/course";
import { Card } from "@/lib/types/cards";
import { Message } from "@/lib/types/chat";
import { FileAttachment } from "@/lib/types/uploads";
import { Quiz, QuizAttempt, QuizQuestion } from "@/lib/types/quiz";
import {
  MAX_CHAT_CHARS_PER_LESSON,
  MAX_JSON_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_REPORT_IMAGES,
} from "./constants";

export type ReportAsset = {
  id: string;
  sourceUrl: string;
  mimeType: string;
  suggestedTitle: string;
  lessonId: string;
};

export type LessonBundleJson = {
  lessonId: string;
  lessonIndex: number;
  title: string;
  optional: boolean;
  includeRichOptional: boolean;
  framing: string;
  chatTranscript: string;
  unlockedCardsSummary: string;
  uploadsList: string;
  quizzesBlock: string;
};

function isFileAtt(a: unknown): a is FileAttachment {
  return !!a && typeof a === "object" && "type" in a && (a as FileAttachment).type === "file";
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n[truncated]`;
}

function formatAttemptQuestionBreakdown(questions: QuizQuestion[], attempt: Pick<QuizAttempt, "answers" | "results">) {
  return questions
    .map((q, i) => {
      const ans = attempt.answers[i];
      const res = attempt.results[i];
      const ansStr = typeof ans === "number" && q.type === "MCQ" ? (q.content as { options: string[] }).options[ans] ?? String(ans) : String(ans ?? "");
      const maxScore = q.type === "FRQ" ? 3 : 1;
      const lines = [
        `Q${i + 1}: ${q.question}`,
        `Type: ${q.type}`,
        `Student answer: ${ansStr || "(blank)"}`,
      ];

      if (res) {
        lines.push(`Score: ${res.score}/${maxScore}`);
        lines.push(`Correct: ${res.isCorrect ? "yes" : "no"}`);
        lines.push(`Expected answer: ${res.correctAnswer || "—"}`);
        if (q.type === "FRQ") {
          lines.push(`FRQ feedback: ${res.feedback || "—"}`);
        }
      }

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}

function sortAttempts(attempts: QuizAttempt[]): QuizAttempt[] {
  return [...attempts].sort((a, b) => {
    if (a.attemptNumber !== b.attemptNumber) return a.attemptNumber - b.attemptNumber;
    return new Date(String(a.submittedAt)).getTime() - new Date(String(b.submittedAt)).getTime();
  });
}

function buildQuizProgressBlock(label: string, quiz: Quiz, attempts: QuizAttempt[]): string {
  if (attempts.length === 0) {
    return `${label}: ${quiz.title} (no attempts)`;
  }

  const orderedAttempts = sortAttempts(attempts);
  const latest = [...orderedAttempts].sort((a, b) => new Date(String(b.submittedAt)).getTime() - new Date(String(a.submittedAt)).getTime())[0];
  const best = [...orderedAttempts].sort((a, b) => b.percentScore - a.percentScore || b.totalScore - a.totalScore)[0];
  const timeline = orderedAttempts
    .map((attempt) => `Attempt ${attempt.attemptNumber}: ${attempt.totalScore}/${attempt.maxScore} (${attempt.percentScore}%)`)
    .join("; ");

  return [
    `${label}: ${quiz.title}`,
    `Attempts: ${orderedAttempts.length}`,
    `Score timeline: ${timeline}`,
    `Best score: ${best.totalScore}/${best.maxScore} (${best.percentScore}%)`,
    `Latest attempt: ${latest.totalScore}/${latest.maxScore} (${latest.percentScore}%)`,
    "Latest attempt details:",
    formatAttemptQuestionBreakdown(quiz.questions, latest),
  ].join("\n");
}

async function loadProjectsForLesson(courseId: string, lessonId: string, uid: string): Promise<{ id: string }[]> {
  const snap = await adminDb.collection("projects").where("courseId", "==", courseId).where("ownerId", "==", uid).get();
  return snap.docs.filter((d) => (d.data().courseLesson as { id?: string } | undefined)?.id === lessonId).map((d) => ({ id: d.id }));
}

async function loadChatMessages(projectId: string, uid: string): Promise<Message[]> {
  const ref = adminDb.collection("projects").doc(projectId).collection("chats").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return [];
  return (snap.data()?.messages || []) as Message[];
}

function messagesToTranscript(messages: Message[], budget: number): string {
  let used = 0;
  const lines: string[] = [];
  for (const m of messages) {
    if (!m.content?.trim()) continue;
    const role = m.isResponse ? "Tutor" : "Student";
    const piece = clip(`${role}: ${m.content}`, MAX_MESSAGE_CHARS);
    if (used + piece.length > budget) {
      lines.push("[Chat truncated]");
      break;
    }
    lines.push(piece);
    used += piece.length + 1;
  }
  return lines.join("\n\n");
}

function summarizeUnlockedCards(cards: Card[]): string {
  const rows = cards.filter((c) => c.isUnlocked && !c.exclude);
  if (rows.length === 0) return "(No unlocked cards recorded.)";
  return rows
    .map((c) => {
      const details = (c.details || []).filter(Boolean).join(" | ");
      return `- **${c.title}**${details ? `: ${details}` : ""}`;
    })
    .join("\n");
}

function listUploads(files: { name: string; mimeType: string; url: string }[]): string {
  if (files.length === 0) return "(No file uploads.)";
  return files.map((f) => `- ${f.name} (${f.mimeType}): ${f.url}`).join("\n");
}

function optionalLessonSubstantial(params: {
  projectCount: number;
  userMessageCount: number;
  uploadCount: number;
  unlockedCardCount: number;
  quizAttemptCount: number;
}): boolean {
  if (params.projectCount === 0) return false;
  return (
    params.userMessageCount >= 3
    || params.uploadCount >= 1
    || params.unlockedCardCount >= 2
    || params.quizAttemptCount >= 1
  );
}

export type PortfolioAggregate = {
  courseTitle: string;
  lessonBundles: LessonBundleJson[];
  courseLevelQuizzesBlock: string;
  assetManifest: ReportAsset[];
};

export async function aggregatePortfolioInput(
  course: Course,
  uid: string,
  lessonProgress: Record<string, CourseStudentLessonProgress> | undefined,
): Promise<PortfolioAggregate> {
  const sortedLessons = [...course.lessons].sort((a, b) => a.index - b.index);
  const assetManifest: ReportAsset[] = [];
  let assetCounter = 0;
  const pushAsset = (a: Omit<ReportAsset, "id"> & { lessonId: string }) => {
    if (assetManifest.length >= MAX_REPORT_IMAGES) return;
    const id = `asset_${++assetCounter}`;
    assetManifest.push({ id, ...a });
  };

  const lessonBundles: LessonBundleJson[] = [];

  for (const lesson of sortedLessons) {
    const lp = lessonProgress?.[lesson.id];
    const projects = await loadProjectsForLesson(course.id, lesson.id, uid);
    const allMessages: Message[] = [];
    const allUploads: { name: string; mimeType: string; url: string }[] = [];
    const unlockedCardMap = new Map<string, Card>();
    let userMessageCount = 0;

    for (const p of projects) {
      const msgs = await loadChatMessages(p.id, uid);
      for (const m of msgs) {
        allMessages.push(m);
        if (!m.isResponse && m.content?.trim()) userMessageCount++;
      }
      const ups = await fetchUploadsFromProject(p.id);
      for (const u of ups) {
        allUploads.push({ name: u.name, mimeType: u.mimeType, url: u.url });
        if (u.mimeType.startsWith("image/")) {
          pushAsset({
            sourceUrl: u.url,
            mimeType: u.mimeType,
            suggestedTitle: u.name,
            lessonId: lesson.id,
          });
        }
      }
      const cards = await fetchCardsFromProject(p.id);
      for (const c of cards) {
        if (c.isUnlocked && !c.exclude) unlockedCardMap.set(c.id, c);
      }
      for (const m of msgs) {
        const atts = m.attachments || [];
        for (const a of atts) {
          if (isFileAtt(a) && a.mimeType.startsWith("image/")) {
            allUploads.push({ name: a.name, mimeType: a.mimeType, url: a.url });
            pushAsset({
              sourceUrl: a.url,
              mimeType: a.mimeType,
              suggestedTitle: a.name,
              lessonId: lesson.id,
            });
          }
        }
      }
    }
    const unlockedCardsFromProjects = [...unlockedCardMap.values()];
    const progressUnlockCount = lp?.unlockedCardIds?.length ?? 0;
    const unlockedCountForHeuristic = Math.max(unlockedCardsFromProjects.length, progressUnlockCount);

    let quizAttemptCount = 0;
    const quizBlocks: string[] = [];
    for (const qid of lesson.quizIds || []) {
      try {
        const quiz = await fetchQuiz(qid);
        const attempts = await fetchQuizAttemptsForUser(qid, uid);
        if (attempts.length > 0) quizAttemptCount++;
        quizBlocks.push(buildQuizProgressBlock("Lesson quiz", quiz, attempts));
      } catch {
        quizBlocks.push(`Quiz ${qid}: (could not load)`);
      }
    }

    const includeRichOptional =
      !lesson.optional
      || optionalLessonSubstantial({
        projectCount: projects.length,
        userMessageCount,
        uploadCount: allUploads.length,
        unlockedCardCount: unlockedCountForHeuristic,
        quizAttemptCount,
      });

    const framingParts = [
      `Lesson ${lesson.index + 1}: ${lesson.title}`,
      lesson.description || "",
      lesson.guide?.body || lesson.content || "",
    ];
    const framing = clip(framingParts.filter(Boolean).join("\n\n"), includeRichOptional ? 6_000 : 1_200);

    const chatTranscript = includeRichOptional
      ? clip(messagesToTranscript(allMessages, MAX_CHAT_CHARS_PER_LESSON), MAX_CHAT_CHARS_PER_LESSON)
      : projects.length > 0
        ? "(Optional lesson — light summary only; student opened this lesson.)"
        : "(Not started.)";

    const unlockedSummary = includeRichOptional
      ? summarizeUnlockedCards(unlockedCardsFromProjects)
      : projects.length > 0
        ? `(Light: ${unlockedCountForHeuristic} unlock(s) recorded.)`
        : "";

    const uploadsList = includeRichOptional ? listUploads(allUploads) : "";

    const quizzesBlock = includeRichOptional ? quizBlocks.join("\n\n---\n\n") || "(No lesson quizzes.)" : "";

    lessonBundles.push({
      lessonId: lesson.id,
      lessonIndex: lesson.index,
      title: lesson.title,
      optional: lesson.optional === true,
      includeRichOptional,
      framing,
      chatTranscript,
      unlockedCardsSummary: unlockedSummary,
      uploadsList,
      quizzesBlock,
    });

    if (includeRichOptional) {
      for (const c of lesson.cardsToUnlock) {
        for (const url of c.refImageUrls || []) {
          if (url && assetManifest.length < MAX_REPORT_IMAGES) {
            pushAsset({
              sourceUrl: url,
              mimeType: "image/jpeg",
              suggestedTitle: c.title,
              lessonId: lesson.id,
            });
          }
        }
      }
    }
  }

  const courseQuizParts: string[] = [];
  for (const qid of course.quizIds || []) {
    try {
      const quiz = await fetchQuiz(qid);
      const attempts = await fetchQuizAttemptsForUser(qid, uid);
      courseQuizParts.push(buildQuizProgressBlock("Course quiz", quiz, attempts));
    } catch {
      courseQuizParts.push(`Course quiz ${qid}: (could not load)`);
    }
  }

  let payload: PortfolioAggregate = {
    courseTitle: course.title,
    lessonBundles,
    courseLevelQuizzesBlock: courseQuizParts.join("\n\n---\n\n") || "(No course-level quizzes.)",
    assetManifest,
  };

  let json = JSON.stringify(payload);
  while (json.length > MAX_JSON_CHARS && payload.lessonBundles.length > 1) {
    payload = {
      ...payload,
      lessonBundles: payload.lessonBundles.map((b, i) =>
        i === payload.lessonBundles.length - 1
          ? {
              ...b,
              chatTranscript: clip(b.chatTranscript, Math.floor(b.chatTranscript.length * 0.7)),
              framing: clip(b.framing, Math.floor(b.framing.length * 0.7)),
              quizzesBlock: clip(b.quizzesBlock, Math.floor(b.quizzesBlock.length * 0.8)),
            }
          : b,
      ),
    };
    json = JSON.stringify(payload);
  }
  if (json.length > MAX_JSON_CHARS) {
    payload = {
        ...payload,
        lessonBundles: payload.lessonBundles.map((b) => ({
          ...b,
          chatTranscript: clip(b.chatTranscript, 2_000),
          framing: clip(b.framing, 1_000),
          quizzesBlock: clip(b.quizzesBlock, 2_500),
        })),
        courseLevelQuizzesBlock: clip(payload.courseLevelQuizzesBlock, 3_000),
      };
  }

  return payload;
}
