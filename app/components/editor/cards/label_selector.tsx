"use client";

import React from "react";
import { Label } from "@/lib/types";
import { LABEL_DEFINITIONS } from "@/lib/labels";

type LabelSelectorProps = {
    selectedLabels: Label[];
    onLabelsChangeAction: (labels: Label[]) => void;
};

export default function LabelSelector({ selectedLabels, onLabelsChangeAction }: LabelSelectorProps) {
    const toggleLabel = (labelId: Label) => {
        if (selectedLabels.includes(labelId)) {
            onLabelsChangeAction(selectedLabels.filter(l => l !== labelId));
        } else {
            onLabelsChangeAction([...selectedLabels, labelId]);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--neutral-400)]">Labels</label>
            <div className="flex flex-wrap gap-2">
                {LABEL_DEFINITIONS.map((labelDef) => {
                    const isSelected = selectedLabels.includes(labelDef.id);
                    const Icon = labelDef.icon;
                    
                    return (
                        <button
                            key={labelDef.id}
                            type="button"
                            onClick={() => toggleLabel(labelDef.id)}
                            className={`px-3 py-2 rounded-md transition-colors duration-200 text-sm whitespace-nowrap flex items-center gap-2 ${
                                isSelected 
                                    ? 'bg-[var(--neutral-400)] text-[var(--foreground)]' 
                                    : 'bg-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-300)]'
                            }`}
                            title={labelDef.description}
                        >
                            <Icon size={16} />
                            {labelDef.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}