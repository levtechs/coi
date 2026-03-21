export type Label = "important" | "ignore" | "exclude from quiz" | "exclude from hierarchy" | "investigate further" | "duplicate";

export interface Card {
  id: string;
  title: string;
  kind?: "note" | "resource";
  url?: string;
  details?: string[];
  refImageUrls?: string[];
  iconUrl?: string;
  exclude?: boolean;
  isUnlocked?: boolean;
  labels?: Label[];
}

export type NewCard = Omit<Card, "id"> & {
  labels?: Label[];
};

export interface CardFilter {
  knowledge: boolean;
  resource: boolean;
  important: boolean;
}

export const DEFAULT_CARD_FILTER: CardFilter = {
  knowledge: true,
  resource: true,
  important: true,
};
