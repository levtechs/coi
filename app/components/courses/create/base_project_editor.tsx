"use client";

import { LessonProjectTemplate } from "@/lib/types/course";

interface BaseProjectEditorProps {
  value?: LessonProjectTemplate;
  onChange: (value: LessonProjectTemplate | undefined) => void;
}

function getSectionTitle(value?: LessonProjectTemplate): string {
  const firstSection = value?.hierarchy?.children?.find((child) => child.type === "subcontent");
  return firstSection?.type === "subcontent" ? firstSection.content.title : "";
}

function getSectionNote(value?: LessonProjectTemplate): string {
  const firstSection = value?.hierarchy?.children?.find((child) => child.type === "subcontent");
  if (firstSection?.type !== "subcontent") return "";
  const firstNote = firstSection.content.children.find((child) => child.type === "text");
  return firstNote?.type === "text" ? firstNote.text : "";
}

function getStarterMessage(value?: LessonProjectTemplate): string {
  const firstResponse = value?.messages?.find((message) => message.isResponse);
  return firstResponse?.content || "";
}

export default function BaseProjectEditor({ value, onChange }: BaseProjectEditorProps) {
  const template = value || {};

  const updateTemplate = (partial: Partial<LessonProjectTemplate>) => {
    const next = {
      ...template,
      ...partial,
    };

    const hasHierarchy = !!next.hierarchy?.children?.length;
    const hasStarter = !!next.messages?.length;
    const hasTitle = !!next.title?.trim();
    const hasSharing = !!next.shareWithOwner || !!next.shareWithStaff;

    if (!hasHierarchy && !hasStarter && !hasTitle && !hasSharing) {
      onChange(undefined);
      return;
    }

    onChange(next);
  };

  const updateHierarchy = (sectionTitle: string, noteText: string) => {
    if (!sectionTitle.trim() && !noteText.trim()) {
      updateTemplate({ hierarchy: undefined });
      return;
    }

    updateTemplate({
      hierarchy: {
        title: template.title?.trim() || "Lesson Project",
        children: [
          {
            type: "subcontent",
            content: {
              title: sectionTitle.trim() || "Getting Started",
              children: noteText.trim() ? [{ type: "text", text: noteText }] : [],
            },
          },
        ],
      },
    });
  };

  const sectionTitle = getSectionTitle(value);
  const sectionNote = getSectionNote(value);
  const starterMessage = getStarterMessage(value);

  return (
    <div className="mb-4 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] p-4">
      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Base project template</label>
      <p className="text-xs text-[var(--neutral-600)] mb-3">
        Keep this simple for V1: an optional title override, one starter section with one note, one assistant starter message, and sharing toggles.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={template.title || ""}
          onChange={(e) => {
            const title = e.target.value;
            updateTemplate({
              title,
              hierarchy: template.hierarchy
                ? {
                    ...template.hierarchy,
                    title: title.trim() || template.hierarchy.title,
                  }
                : template.hierarchy,
            });
          }}
          className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)]"
          placeholder="Optional project title override"
        />
        <input
          type="text"
          value={sectionTitle}
          onChange={(e) => updateHierarchy(e.target.value, sectionNote)}
          className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)]"
          placeholder="Starter section title"
        />
      </div>

      <textarea
        value={sectionNote}
        onChange={(e) => updateHierarchy(sectionTitle, e.target.value)}
        className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] h-24 mb-3"
        placeholder="Starter note shown in the initial hierarchy"
      />

      <textarea
        value={starterMessage}
        onChange={(e) => {
          const content = e.target.value;
          updateTemplate({
            messages: content.trim()
              ? [{ content, isResponse: true }]
              : undefined,
          });
        }}
        className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-200)] text-[var(--foreground)] h-24 mb-3"
        placeholder="Optional assistant starter message seeded into the project chat"
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={template.shareWithOwner || false}
            onChange={(e) => updateTemplate({ shareWithOwner: e.target.checked })}
          />
          Share spawned projects with the course owner
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={template.shareWithStaff || false}
            onChange={(e) => updateTemplate({ shareWithStaff: e.target.checked })}
          />
          Share spawned projects with course staff
        </label>
      </div>
    </div>
  );
}
