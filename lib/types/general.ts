export type Role = "teacher" | "highschool_student" | "university_student" | "grad_student" | "researcher" | "parent" | "professional" | "other";

export type Interest =
  | "programming_technology"
  | "data_science"
  | "artificial_intelligence"
  | "web_development"
  | "mobile_development"
  | "cybersecurity"
  | "mathematics"
  | "physics"
  | "chemistry"
  | "biology"
  | "science"
  | "history"
  | "literature"
  | "philosophy"
  | "psychology"
  | "business_finance"
  | "economics"
  | "entrepreneurship"
  | "marketing"
  | "health_wellness"
  | "fitness"
  | "meditation"
  | "cooking"
  | "creative_arts"
  | "music"
  | "photography"
  | "design_ux"
  | "language_learning"
  | "life_skills"
  | "other";

export type HowDidYouHear =
  | "word_of_mouth"
  | "google_search"
  | "instagram"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "online_forum"
  | "blog_article"
  | "other";

export interface SignUpResponses {
  role?: Role;
  howDidYouHear: HowDidYouHear[];
  interests: Interest[];
}
