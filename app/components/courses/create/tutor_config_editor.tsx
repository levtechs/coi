"use client";

import { CourseResource, TutorPromptConfig, TutorPromptProfileId } from "@/lib/types/course";
import { promptProfileOptions } from "./prompt_profiles";
import ResourceEditor from "./resource_editor";

interface TutorConfigEditorProps {
  label: string;
  value?: TutorPromptConfig;
  onChange: (value: TutorPromptConfig | undefined) => void;
  referenceResources: CourseResource[];
  onReferenceResourcesChange: (resources: CourseResource[]) => void;
  helperText?: string;
}

export default function TutorConfigEditor({ label, value, onChange, referenceResources, onReferenceResourcesChange, helperText }: TutorConfigEditorProps) {
  const selectedProfiles = value?.profileIds || [];

  const toggleProfile = (profileId: TutorPromptProfileId) => {
    const nextProfileIds = selectedProfiles.includes(profileId)
      ? selectedProfiles.filter((id) => id !== profileId)
      : [...selectedProfiles, profileId];

    onChange(nextProfileIds.length === 0 && !value?.customInstruction?.trim()
      ? undefined
      : {
          profileIds: nextProfileIds,
          customInstruction: value?.customInstruction,
        });
  };

  const handleInstructionChange = (customInstruction: string) => {
    const trimmed = customInstruction.trim();
    if (selectedProfiles.length === 0 && !trimmed) {
      onChange(undefined);
      return;
    }

    onChange({
      profileIds: selectedProfiles,
      customInstruction,
    });
  };

  return (
    <div className="space-y-6">
      <div className="border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] p-4">
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">{label}</label>
        {helperText && <p className="text-xs text-[var(--neutral-600)] mb-3">{helperText}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {promptProfileOptions.map((profile) => {
            const isSelected = selectedProfiles.includes(profile.id);
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => toggleProfile(profile.id)}
                className={`text-left border rounded-md p-3 transition-colors ${isSelected ? "border-[var(--accent-500)] bg-[var(--accent-100)]" : "border-[var(--neutral-300)] bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)]"}`}
              >
                <div className="text-sm font-semibold text-[var(--foreground)] mb-1">{profile.title}</div>
                <p className="text-xs text-[var(--neutral-600)]">{profile.description}</p>
              </button>
            );
          })}
        </div>

        <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Custom instructions</label>
        <textarea
          value={value?.customInstruction || ""}
          onChange={(e) => handleInstructionChange(e.target.value)}
          className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-28"
          placeholder="Optional extra tutor instructions (e.g. 'Use a Socratic method', 'Explain like I'm five')"
        />
      </div>

      <ResourceEditor
        label="Tutor Grounding & Reference Knowledge"
        helperText="Upload Markdown files (.md) here to provide the tutor with domain-specific knowledge. The tutor will use this information as its primary source of truth."
        resources={referenceResources}
        onChange={onReferenceResourcesChange}
        defaultIncludeInTutorReference={true}
        defaultStudentVisible={false}
        allowedExtensions=".md,.txt"
      />
    </div>
  );
}
