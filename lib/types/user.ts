import { ChatPreferences } from "@/lib/types/chat";
import { SignUpResponses } from "@/lib/types/general";

export interface User {
  id: string;
  email: string;
  displayName: string;
  actions?: number;
  dailyActions?: number;
  weeklyActions?: number;
  projectIds?: string[];
  friendIds?: string[];
  projectCount?: number;
  friendCount?: number;
  starUser?: boolean;
  chatPreferences?: ChatPreferences;
  signUpResponses?: SignUpResponses;
}
