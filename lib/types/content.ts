export interface ContentHierarchy {
  title: string;
  children: ContentNode[];
}

export type ContentNode =
  | { type: "text"; text: string }
  | { type: "card"; cardId: string }
  | { type: "subcontent"; content: ContentHierarchy };

export type TutorAction =
  | { type: "regenerate_hierarchy" }
  | { type: "delete_card"; cardId: string }
  | { type: "rename_section"; oldTitle: string; newTitle: string }
  | { type: "create_section"; title: string; parentSection?: string }
  | { type: "delete_section"; title: string }
  | { type: "move_card"; cardId: string; toSection: string };
