import { Card } from "@/lib/types/cards";
import { ContentHierarchy, ContentNode } from "@/lib/types/content";
import { FileAttachment } from "@/lib/types/uploads";

export interface Message {
  id?: string;
  content: string;
  attachments?: null | ChatAttachment[];
  isResponse: boolean;
  followUpQuestions?: string[];
}

export interface ThinkData {
  title: string;
  summary: string;
  time: number;
}

export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface GroundingSources {
  type: "sources";
  chunks: GroundingChunk[];
}

export type ChatAttachment = Card | ContentNode | ContentHierarchy | GroundingChunk | GroundingSources | ThinkData | FileAttachment;

export type StreamPhase = "starting" | "streaming" | "processing";

export interface ChatPreferences {
  model: "normal" | "fast";
  thinking: "off" | "force" | "auto";
  googleSearch: "auto" | "force" | "disable";
  forceCardCreation: "off" | "on" | "auto";
  personality: "default" | "gossip" | "little kid" | "angry mom";
  followUpQuestions: "off" | "auto";
  generationModel: "flash" | "flash-lite";
}

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  model: "normal",
  thinking: "auto",
  googleSearch: "auto",
  forceCardCreation: "auto",
  personality: "default",
  followUpQuestions: "auto",
  generationModel: "flash",
};
