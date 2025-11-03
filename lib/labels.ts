import { Label } from "./types";
import { FiStar, FiX, FiBookOpen, FiFilter, FiSearch, FiCopy } from "react-icons/fi";

export interface LabelDefinition {
    id: Label;
    name: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    description: string;
}

export const LABEL_DEFINITIONS: LabelDefinition[] = [
    {
        id: "important",
        name: "Important",
        icon: FiStar,
        color: "var(--warning)",
        description: "Mark this card as important"
    },
    {
        id: "ignore",
        name: "Ignore",
        icon: FiX,
        color: "var(--error)",
        description: "Ignore this card in most contexts"
    },
    {
        id: "exclude from quiz",
        name: "Exclude from Quiz",
        icon: FiBookOpen,
        color: "var(--warning)",
        description: "Don't include this card in quiz questions"
    },
    {
        id: "exclude from hierarchy",
        name: "Exclude from Hierarchy",
        icon: FiFilter,
        color: "var(--neutral-500)",
        description: "Don't include this card in AI-generated hierarchy"
    },
    {
        id: "investigate further",
        name: "Investigate Further",
        icon: FiSearch,
        color: "var(--info)",
        description: "This card needs more investigation"
    },
    {
        id: "duplicate",
        name: "Duplicate",
        icon: FiCopy,
        color: "var(--accent-500)",
        description: "This card may be a duplicate"
    }
];

export const getLabelDefinition = (labelId: Label): LabelDefinition | undefined => {
    return LABEL_DEFINITIONS.find(def => def.id === labelId);
};

export const getLabelIcon = (labelId: Label): React.ComponentType<{ size?: number; className?: string }> | undefined => {
    const def = getLabelDefinition(labelId);
    return def?.icon;
};

export const getLabelColor = (labelId: Label): string => {
    const def = getLabelDefinition(labelId);
    return def?.color || "var(--neutral-500)";
};