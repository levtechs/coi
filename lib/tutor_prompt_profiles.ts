import type { TutorPromptProfileId } from "@/lib/types/course";

export const promptProfileOptions: { id: TutorPromptProfileId; title: string; description: string }[] = [
  {
    id: "course_credibility",
    title: "Course Credibility",
    description: "Makes the tutor sound grounded in the course's terminology, workflows, and materials.",
  },
  {
    id: "guided_practice",
    title: "Guided Practice",
    description: "Encourages the tutor to turn lessons into concrete practice steps instead of only giving explanations.",
  },
  {
    id: "visual_verification",
    title: "Visual Verification",
    description: "Encourages the tutor to ask for screenshots and concrete visual evidence when useful.",
  },
  {
    id: "socratic_unlocking",
    title: "Socratic Unlocking",
    description: "Keeps unlocking tied to probing questions and demonstrated understanding.",
  },
  {
    id: "comparative_reasoning",
    title: "Comparative Reasoning",
    description: "Helps the tutor ask the learner to compare examples, states, strategies, or outcomes and explain the differences.",
  },
  {
    id: "troubleshooting_reflection",
    title: "Troubleshooting and Reflection",
    description: "Encourages the tutor to surface confusion, diagnose mistakes, and help the learner reflect on what still feels uncertain.",
  },
];

const profileById = new Map(promptProfileOptions.map((p) => [p.id, p]));

/** Human-readable lines for tutor system context (API / model). */
export function formatTutorProfileIdsForContext(profileIds: TutorPromptProfileId[] | undefined): string {
  if (!profileIds?.length) return "";
  const lines: string[] = [];
  for (const id of profileIds) {
    const p = profileById.get(id);
    if (p) lines.push(`- ${p.title}: ${p.description}`);
  }
  return lines.join("\n");
}
